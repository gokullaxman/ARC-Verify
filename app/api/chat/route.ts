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
    const sanitizedHistory = (Array.isArray(history) ? history : [])
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

    // 5. In-process fallback if AI microservice is temporarily unavailable
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
