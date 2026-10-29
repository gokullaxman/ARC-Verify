'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  Bot,
  Sparkles,
  X,
  Send,
  Trash2,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Loader2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  suggested_actions?: string[];
  sources?: string[];
}

const SUGGESTED_QUERIES = [
  'What are the land norms for Metro cities?',
  'How is Faculty-to-Student Ratio (FSR) calculated?',
  'What documents are required for Fire Safety NOC?',
  'Explain the HMAC-SHA256 audit ledger integrity status.',
  'How do I resolve a cross-document name discrepancy?',
];

const STORAGE_KEY = 'arc_verify_chat_history_v1';

export const AiHelpChat: React.FC = () => {
  const { currentUser } = useAuth();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Extract caseId if on /cases/[id]
  const caseMatch = pathname?.match(/\/cases\/([a-zA-Z0-9_-]+)/);
  const activeCaseId = caseMatch ? caseMatch[1] : undefined;

  // Initialize from sessionStorage or default welcome
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {
      // Ignore storage errors
    }

    setMessages([
      {
        id: 'welcome-1',
        role: 'assistant',
        content:
          `Welcome to **ARC-Verify Regulatory Assistant**!\n\n` +
          `I am your AICTE Approval Process Handbook (APH 2024–27) scrutiny co-pilot. ` +
          `You can ask me about statutory land norms, faculty ratios, fire safety NOC requirements, ` +
          `cross-document concordance, or audit ledger integrity.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggested_actions: [
          'Review Land Title Deed',
          'Inspect Faculty Roster',
          'View Tamper-Evident Ledger',
        ],
        sources: ['AICTE Approval Process Handbook (APH 2024–27)'],
      },
    ]);
  }, []);

  // Save to sessionStorage on message change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch {
        // Ignore storage errors
      }
    }
  }, [messages]);

  // Autoscroll
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleClearChat = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content:
          'Chat history reset. How can I assist you with institutional regulatory verification today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: ['AICTE Approval Process Handbook (APH 2024–27)'],
      },
    ]);
    setErrorMsg(null);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend !== undefined ? textToSend : inputMessage;
    const trimmed = rawText.trim();
    if (!trimmed || isLoading) return;

    setErrorMsg(null);
    setInputMessage('');

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      // Send history minus welcome message for compactness
      const payloadHistory = newHistory
        .filter(m => !m.id.startsWith('welcome-'))
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: payloadHistory,
          context: {
            caseId: activeCaseId,
            currentPage: pathname || '',
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'No response generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggested_actions: data.suggested_actions || [],
        sources: data.sources || [],
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMsg(err.message || 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format simple markdown into clean HTML
  const formatMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Process bold **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-semibold text-slate-900 dark:text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      // Bullets
      if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-slate-700 dark:text-slate-300 my-0.5">
            {renderedParts}
          </li>
        );
      }

      if (/^\d+\.\s/.test(line.trim())) {
        return (
          <li key={idx} className="ml-4 list-decimal text-slate-700 dark:text-slate-300 my-0.5">
            {renderedParts}
          </li>
        );
      }

      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="text-slate-800 dark:text-slate-200 leading-relaxed my-0.5">
          {renderedParts}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-3 rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 border border-blue-500/40 cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-500/30 group"
          aria-label="Open AI Regulatory Help Chat"
          title="Open ARC-Verify AI Scrutiny Assistant"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <span className="font-medium text-sm tracking-wide">AI Help</span>
          <span className="hidden sm:inline-block text-xs bg-blue-800/80 px-2 py-0.5 rounded-full text-blue-200 font-mono">
            APH 2026
          </span>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[380px] sm:w-[440px] h-[580px] max-h-[85vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="ARC-Verify AI Assistant"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white px-4 py-3 flex items-center justify-between border-b border-blue-800 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm leading-tight">ARC-Verify Assistant</h3>
                  <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-200 px-1.5 py-0.5 rounded border border-emerald-400/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-blue-100/80 leading-tight">
                  AICTE APH 2024–27 Scrutiny Co-Pilot
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Reset conversation"
                aria-label="Reset conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Close chat"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Context Banner */}
          <div className="bg-slate-50 dark:bg-slate-950 px-3.5 py-1.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Role: <strong className="text-slate-700 dark:text-slate-300">{currentUser?.role || 'User'}</strong></span>
            </span>
            {activeCaseId && (
              <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold truncate max-w-[150px]">
                {activeCaseId}
              </span>
            )}
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-900/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] text-xs sm:text-sm p-3.5 rounded-2xl shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                  }`}
                >
                  <div className="space-y-1">
                    {formatMarkdown(msg.content)}
                  </div>

                  {/* Suggested action chips on assistant messages */}
                  {msg.suggested_actions && msg.suggested_actions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700/80 space-y-1.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1">
                        <ArrowRight className="w-2.5 h-2.5 text-blue-500" /> Suggested Actions
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.suggested_actions.map((act, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(act)}
                            className="text-[11px] bg-slate-100 dark:bg-slate-700/70 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600 transition-colors text-left cursor-pointer"
                          >
                            {act}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Source citations */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-400 flex items-center gap-1 flex-wrap">
                      <BookOpen className="w-2.5 h-2.5 text-slate-400" />
                      <span>{msg.sources.join(' • ')}</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* Quick suggested prompt starter chips when thread is short */}
            {messages.length <= 1 && (
              <div className="pt-2">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-blue-500" /> Suggested Questions:
                </div>
                <div className="space-y-1.5">
                  {SUGGESTED_QUERIES.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q)}
                      className="w-full text-left text-xs bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 p-2 rounded-xl border border-slate-200 dark:border-slate-700 transition-all hover:border-blue-300 dark:hover:border-blue-600 flex items-center justify-between group cursor-pointer shadow-xs"
                    >
                      <span className="truncate pr-2">{q}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading typing bubble */}
            {isLoading && (
              <div className="flex items-center gap-2 text-slate-500 text-xs bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 max-w-[200px] shadow-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Consulting APH norms...</span>
              </div>
            )}

            {/* Error message */}
            {errorMsg && (
              <div className="flex items-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1">{errorMsg}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about AICTE rules, land, FSR..."
                  maxLength={1000}
                  disabled={isLoading}
                  className="w-full text-xs sm:text-sm pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all disabled:opacity-60"
                />
                {inputMessage.length > 50 && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                    {inputMessage.length}/1000
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 rounded-xl shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center shrink-0"
                aria-label="Send query"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1.5">
              <span>Press <strong>Enter</strong> to send</span>
              <span className="text-slate-400 font-medium">Grounded in AICTE APH 2024–27</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default AiHelpChat;
