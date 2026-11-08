import React, { useState } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Database,
  Shield,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { queryAssistant } from '../services/api';

export function AssistantPage() {
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: `Hello! I am the **RoadGuard Local Maintenance Assistant**.\n\nI answer road condition and maintenance inquiries by executing real SQL queries directly against your local SQLite database.\n\n*100% local, offline, and rule-based — zero external cloud APIs or paid tokens.*`,
      data: null,
      recommendations: [
        'Try asking about critical potholes or high-risk corridors.',
        'Ask which road needs immediate emergency resurfacing.'
      ],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sampleQuestions = [
    'How many potholes are critical?',
    'Which road needs immediate repair?',
    'How many potholes were repaired?',
    'Which locations have the highest priority?',
    'Show pending repairs',
    'Summarize road conditions across the city'
  ];

  const handleSend = async (queryText) => {
    const text = queryText || input;
    if (!text.trim() || loading) return;

    const userMsg = {
      sender: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await queryAssistant(text.trim());
      const assistantMsg = {
        sender: 'assistant',
        text: res.answer,
        data: res.data,
        recommendations: res.recommendations || [],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Error processing local query: ' + (err.message || 'Database unavailable.'),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto flex flex-col h-[calc(100vh-5rem)]">
      {/* Top Banner */}
      <div className="bg-navy-900 p-5 rounded-2xl border border-navy-800 shadow-xl shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Bot className="w-4 h-4" />
            <span>Local Engineering Intelligence Agent</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Local Road Maintenance Assistant
          </h2>
          <p className="text-xs text-slate-400 max-w-xl mt-0.5">
            Rule-based municipal query engine. Queries local SQLite records in real-time. No cloud AI, OpenAI, or Gemini required.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-navy-950 px-3 py-1.5 rounded-xl border border-navy-800 text-xs font-mono text-emerald-400 shrink-0">
          <Database className="w-3.5 h-3.5" />
          <span>Local Engine: Active</span>
        </div>
      </div>

      {/* Preset Question Chips */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" /> Quick Inquiries:
        </span>
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={loading}
            className="px-3 py-1 rounded-lg text-xs font-medium bg-navy-900 hover:bg-navy-800 text-slate-300 hover:text-cyan-300 border border-navy-800 hover:border-cyan-500/30 transition-all disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 bg-navy-900 rounded-2xl border border-navy-800 shadow-2xl p-5 overflow-y-auto space-y-4">
        {messages.map((m, idx) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={idx}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/20'
                }`}
              >
                {isUser ? 'ME' : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs space-y-3 leading-relaxed ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-navy-950 border border-navy-800 text-slate-200 rounded-tl-none shadow-lg'
                }`}
              >
                <div className="whitespace-pre-line prose-sm prose-invert">
                  {m.text}
                </div>

                {/* Optional Structured Data Table Render */}
                {Array.isArray(m.data) && m.data.length > 0 && (
                  <div className="bg-navy-900 rounded-xl border border-navy-800 overflow-hidden mt-2">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px] font-mono">
                        <thead className="bg-navy-950/80 text-slate-400 border-b border-navy-800">
                          <tr>
                            {Object.keys(m.data[0]).map((col) => (
                              <th key={col} className="py-2 px-3 uppercase text-[10px]">
                                {col.replace('_', ' ')}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-navy-800 text-slate-300">
                          {m.data.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-navy-850/50">
                              {Object.values(row).map((val, cIdx) => (
                                <td key={cIdx} className="py-2 px-3">
                                  {typeof val === 'number' ? val : String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Recommendations Pill List */}
                {m.recommendations && m.recommendations.length > 0 && (
                  <div className="border-t border-navy-800/80 pt-2 space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 block">
                      Recommended Engineering Directives:
                    </span>
                    <ul className="list-disc list-inside text-slate-400 text-[11px] space-y-0.5">
                      {m.recommendations.map((rec, rIdx) => (
                        <li key={rIdx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className={`text-[10px] font-mono ${isUser ? 'text-blue-200 text-right' : 'text-slate-400'}`}>
                  {m.time}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div className="bg-navy-950 border border-navy-800 px-4 py-3 rounded-2xl text-xs text-slate-400 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>Querying SQLite pavement indexes...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Field */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="shrink-0 flex items-center gap-3 bg-navy-900 p-2.5 rounded-2xl border border-navy-800 shadow-xl"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask RoadGuard assistant about critical defects, repairs, or road conditions..."
          className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}

