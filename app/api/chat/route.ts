import { NextRequest, NextResponse } from 'next/server';
import { requireUser, handleRouteError } from '@/lib/guard';
import { canAccessCase } from '@/lib/auth';
import { getDossierRepository } from '@/repositories/dossier-repository';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

interface IncomingChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface IncomingChatBody {
  message?: string;
  history?: IncomingChatMessage[];
  context?: {
    caseId?: string;
    currentPage?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // 1. Session verification: Caller must be authenticated and active
    const caller = await requireUser(request);

    // 2. Parse & sanitize payload
    let body: IncomingChatBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Malformed JSON payload' },
        { status: 400 }
      );
    }

    const { message, history = [], context = {} } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Message exceeds maximum limit of 2,000 characters' },
        { status: 400 }
      );
    }

    // Sanitize conversation history (max 15 turns)
    const sanitizedHistory: IncomingChatMessage[] = (Array.isArray(history) ? history : [])
      .slice(-15)
      .map(item => ({
        role: item.role === 'assistant' ? 'assistant' : item.role === 'system' ? 'system' : 'user',
        content: String(item.content || '').slice(0, 2000),
      }));

    // 3. Build context & enforce object-level authorization for case data
    const enrichedContext: Record<string, any> = {
      user_role: caller.role,
      user_name: caller.name,
      current_page: context.currentPage ? String(context.currentPage).slice(0, 100) : '',
    };

    if (context.caseId && typeof context.caseId === 'string') {
      const repo = getDossierRepository();
      const dossier = repo.getCaseById(context.caseId);
      if (dossier) {
        if (!canAccessCase(caller, dossier)) {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'FORBIDDEN',
              error: `You do not have permission to access data for case ${context.caseId}.`,
            },
            { status: 403 }
          );
        }

        // Attach safe summary metadata
        const findings = repo.listFindingsByCase(dossier.id);
        const failCount = findings.filter(f => f.status === 'FAIL').length;
        const warnCount = findings.filter(f => f.status === 'WARNING').length;
        const passCount = findings.filter(f => f.status === 'PASS').length;

        enrichedContext.case_id = dossier.id;
        enrichedContext.case_title = dossier.institution?.legalName || dossier.application?.formData?.declaredInstitutionName || dossier.id;
        enrichedContext.case_status = dossier.status;
        enrichedContext.application_type = dossier.application?.applicationType || 'General';
        enrichedContext.findings_summary = `${passCount} Pass, ${failCount} Fail, ${warnCount} Warning`;
      }
    }

    // 4. Dispatch to FastAPI AI Service with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const aiResponse = await fetch(`${AI_SERVICE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ARC-Verify-Internal': 'true',
        },
        body: JSON.stringify({
          message: message.trim(),
          history: sanitizedHistory,
          context: enrichedContext,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        return NextResponse.json({
          success: true,
          reply: aiData.reply,
          suggested_actions: aiData.suggested_actions || [],
          sources: aiData.sources || [],
        });
      } else {
        const errText = await aiResponse.text();
        console.warn(`AI Service /chat returned status ${aiResponse.status}: ${errText}`);
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      console.warn(`AI Service /chat unreachable: ${fetchErr?.message || fetchErr}`);
    }

    // 5. Direct Gemini API call if key is available in environment (ideal for Vercel Serverless)
    if (process.env.GEMINI_API_KEY) {
      try {
        const directGemini = await generateDirectGeminiChat(message, sanitizedHistory, enrichedContext);
        if (directGemini) {
          return NextResponse.json({
            success: true,
            reply: directGemini.reply,
            suggested_actions: directGemini.suggested_actions,
            sources: directGemini.sources,
            direct_gemini: true,
          });
        }
      } catch (geminiErr: any) {
        console.warn(`Direct Gemini API fallback failed: ${geminiErr?.message || geminiErr}`);
      }
    }

    // 6. In-process fallback if AI microservice and direct Gemini are offline
    const fallbackReply = generateInProcessFallback(message, caller.role);
    return NextResponse.json({
      success: true,
      reply: fallbackReply.reply,
      suggested_actions: fallbackReply.suggested_actions,
      sources: fallbackReply.sources,
      is_fallback: true,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

async function generateDirectGeminiChat(
  message: string,
  history: IncomingChatMessage[],
  context: Record<string, any>
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const systemInstruction =
    'You are the ARC-Verify AI Assistant, an intelligent co-pilot for AICTE Approval Scrutiny ' +
    'and Regulatory Verification (Smart India Hackathon 2026, Problem Statement 26261).\n' +
    'Your role is to assist scrutiny officers, compliance auditors, applicants, and administrators ' +
    'with navigating the application, understanding AICTE Approval Process Handbook (APH 2024–27) standards, ' +
    'interpreting verification findings, verifying audit ledger integrity, and resolving document discrepancies.\n' +
    'Professional, concise, authoritative, and direct. Base your responses strictly on statutory standards and system evidence.';

  const promptParts: string[] = [];
  if (context) {
    const ctxLines: string[] = [];
    if (context.user_role) ctxLines.push(`User Role: ${context.user_role}`);
    if (context.case_id) ctxLines.push(`Active Case: ${context.case_id} (${context.case_title || ''}) - Status: ${context.case_status || ''}`);
    if (context.current_page) ctxLines.push(`Current Page: ${context.current_page}`);
    if (ctxLines.length > 0) promptParts.push('Context:\n' + ctxLines.join('\n'));
  }

  if (history && history.length > 0) {
    promptParts.push('Recent Conversation:');
    for (const turn of history.slice(-6)) {
      promptParts.push(`${turn.role === 'assistant' ? 'Assistant' : 'User'}: ${turn.content}`);
    }
  }

  promptParts.push(`User: ${message}`);
  promptParts.push('ARC-Verify Assistant:');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptParts.join('\n\n') }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!replyText) return null;

  const actions: string[] = [];
  const q = (message + ' ' + replyText).toLowerCase();
  if (q.includes('land') || q.includes('acre')) actions.push('Review Land Title Deed', 'Check Khasra / Survey Numbers');
  if (q.includes('faculty') || q.includes('fsr')) actions.push('Inspect Faculty Roster', 'Verify EPF Disbursal Records');
  if (q.includes('fire') || q.includes('noc')) actions.push('Verify Fire NOC Validity', 'Inspect Building Setbacks');
  if (q.includes('audit') || q.includes('ledger')) actions.push('View Tamper-Evident Ledger', 'Verify HMAC Hash Chain');
  if (actions.length === 0) actions.push('Run Automated Dossier Scrutiny', 'View Case Concordance Summary');

  return {
    reply: replyText.trim(),
    suggested_actions: actions.slice(0, 3),
    sources: ['AICTE Approval Process Handbook (APH 2024–27)'],
  };
}

function generateInProcessFallback(message: string, role: string) {
  const q = message.toLowerCase();

  if (q.includes('land') || q.includes('acre')) {
    return {
      reply:
        '**AICTE Approval Process Handbook (APH 2024–27) — Land Requirements:**\n\n' +
        '• **Mega / Metro:** Min 1.5 – 2.5 acres.\n' +
        '• **Urban:** Min 2.5 – 4.0 acres.\n' +
        '• **Rural:** Min 7.5 – 10.0 acres.\n\n' +
        'Land must be contiguous, registered in the trust name, converted for educational use (NA/CLU), and free of encumbrance.',
      suggested_actions: ['Review Land Title Deed', 'Check Khasra / Survey Numbers'],
      sources: ['AICTE Approval Process Handbook 2024–27, Appendix 4'],
    };
  }

  if (q.includes('faculty') || q.includes('fsr') || q.includes('ratio')) {
    return {
      reply:
        '**AICTE Faculty-to-Student Ratio (FSR) Guidelines:**\n\n' +
        '• Standard UG Engineering FSR: **1:20**.\n' +
        '• Cadre Distribution: **1 : 2 : 6** (Professor : Associate Professor : Assistant Professor).\n' +
        '• Qualifications must strictly align with AICTE pay scales (7th CPC) and include Aadhaar-verified EPF records.',
      suggested_actions: ['Inspect Faculty Roster', 'Verify EPF Disbursal Records'],
      sources: ['AICTE Approval Process Handbook 2024–27, Appendix 7'],
    };
  }

  return {
    reply:
      `Hello! I am the **ARC-Verify AI Assistant** (Active role: ${role}).\n\n` +
      'I can guide you through AICTE APH 2024–27 scrutiny requirements, cross-document concordance, fire safety NOC validation, and cryptographic audit ledger health.\n\n' +
      'Please ask a regulatory or verification question.',
    suggested_actions: [
      'View Dossier Concordance Matrix',
      'Check Audit Ledger Health',
    ],
    sources: ['AICTE Approval Process Handbook 2024–27'],
  };
}
