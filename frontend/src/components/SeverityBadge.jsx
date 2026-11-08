import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

export function SeverityBadge({ severity, showIcon = true, size = 'md' }) {
  const configs = {
    Critical: {
      bg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
      dot: 'bg-rose-500',
      icon: AlertTriangle,
    },
    High: {
      bg: 'bg-orange-500/15 border-orange-500/30 text-orange-400',
      dot: 'bg-orange-500',
      icon: AlertCircle,
    },
    Medium: {
      bg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
      dot: 'bg-amber-500',
      icon: Info,
    },
    Low: {
      bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
      dot: 'bg-emerald-500',
      icon: CheckCircle,
    },
  };

  const current = configs[severity] || configs.Medium;
  const Icon = current.icon;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-3 py-1.5 text-sm font-semibold' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${current.bg} ${padding} transition-all`}>
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      <span>{severity || 'Medium'}</span>
    </span>
  );
}

export function PriorityBadge({ score, category, showScore = true }) {
  let color = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (score >= 80 || category === 'Critical') {
    color = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  } else if (score >= 60 || category === 'High') {
    color = 'text-orange-400 bg-orange-500/10 border-orange-500/30';
  } else if (score >= 40 || category === 'Medium') {
    color = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border ${color}`}>
      {category && <span>{category}</span>}
      {showScore && (
        <span className="opacity-90 font-bold bg-slate-900/60 px-1.5 py-0.5 rounded">
          {score}/100
        </span>
      )}
    </span>
  );
}

export function StatusBadge({ status, size = 'md' }) {
  const configs = {
    'Detected': 'bg-slate-700/30 text-slate-300 border-slate-600',
    'Reported': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    'Assigned': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    'In Progress': 'bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse',
    'Repaired': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'Verified': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  };

  const style = configs[status] || 'bg-slate-800 text-slate-300 border-slate-700';
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border ${style} ${padding}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      <span>{status || 'Detected'}</span>
    </span>
  );
}

