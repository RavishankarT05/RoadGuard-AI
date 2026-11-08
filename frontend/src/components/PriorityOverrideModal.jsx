import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { overridePriority } from '../services/api';

export function PriorityOverrideModal({ pothole, onClose, onSuccess }) {
  const [priorityScore, setPriorityScore] = useState(pothole?.priority_score || 50);
  const [priorityCategory, setPriorityCategory] = useState(pothole?.priority_category || 'Medium');
  const [officerName, setOfficerName] = useState('Chief Municipal Civil Engineer');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!pothole) return null;

  const handleScoreChange = (score) => {
    setPriorityScore(score);
    if (score >= 80) setPriorityCategory('Critical');
    else if (score >= 60) setPriorityCategory('High');
    else if (score >= 40) setPriorityCategory('Medium');
    else setPriorityCategory('Low');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A transparent engineering rationale is mandatory for priority override audit.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await overridePriority(pothole.id, {
        priority_score: parseInt(priorityScore),
        priority_category: priorityCategory,
        override_reason: reason.trim(),
        officer_name: officerName
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to apply priority override.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-navy-900 border border-navy-700 w-full max-w-lg rounded-2xl shadow-2xl shadow-cyan-950/30 overflow-hidden my-8">
        <div className="p-5 border-b border-navy-800 flex items-center justify-between bg-navy-850">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Authority Priority Override</h3>
              <p className="text-xs text-slate-400 font-mono">{pothole.pothole_code} • Currently {pothole.priority_score}/100</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-navy-950 p-4 rounded-xl border border-navy-800">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Override Priority Index (0 - 100)
              </label>
              <span className="font-mono font-bold text-base text-cyan-400 bg-navy-900 px-3 py-1 rounded border border-navy-700">
                {priorityScore} / 100
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={priorityScore}
              onChange={(e) => handleScoreChange(parseInt(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>0 (Low)</span>
              <span>40 (Medium)</span>
              <span>60 (High)</span>
              <span>80+ (Critical)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Assigned Priority Tier</label>
            <select
              value={priorityCategory}
              onChange={(e) => setPriorityCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
            >
              <option value="Critical">Critical (Immediate Emergency Action)</option>
              <option value="High">High (Repair within 24-48 hours)</option>
              <option value="Medium">Medium (Scheduled within 7 days)</option>
              <option value="Low">Low (Routine Monthly Cycle)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Authorizing Official</label>
            <input
              type="text"
              value={officerName}
              onChange={(e) => setOfficerName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Mandatory Override Justification *</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State reason (e.g. VIP transit corridor, heavy school bus route, structural sub-base collapse risk)..."
              className="w-full px-3 py-2 rounded-lg bg-navy-950 border border-navy-700 text-white text-xs focus:border-cyan-500 focus:outline-none resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-navy-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-navy-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply Override & Log Audit</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

