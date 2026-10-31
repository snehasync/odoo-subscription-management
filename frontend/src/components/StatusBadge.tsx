import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
  isOverdue?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', isOverdue }) => {
  const norm = (status || '').toUpperCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (isOverdue && norm !== 'PAID' && norm !== 'CANCELLED') {
    styles = 'bg-rose-50 text-rose-700 border-rose-200';
    dotColor = 'bg-rose-500 animate-pulse';
  } else {
    switch (norm) {
      case 'ACTIVE':
        styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        dotColor = 'bg-emerald-500';
        break;
      case 'CONFIRMED':
        styles = 'bg-blue-50 text-blue-700 border-blue-200';
        dotColor = 'bg-blue-500';
        break;
      case 'QUOTATION':
        styles = 'bg-purple-50 text-purple-700 border-purple-200';
        dotColor = 'bg-purple-500';
        break;
      case 'DRAFT':
        styles = 'bg-slate-100 text-slate-700 border-slate-200';
        dotColor = 'bg-slate-400';
        break;
      case 'CLOSED':
        styles = 'bg-zinc-100 text-zinc-600 border-zinc-300';
        dotColor = 'bg-zinc-400';
        break;
      case 'PAID':
        styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        dotColor = 'bg-emerald-500';
        break;
      case 'CANCELLED':
        styles = 'bg-amber-50 text-amber-700 border-amber-200';
        dotColor = 'bg-amber-500';
        break;
      default:
        styles = 'bg-slate-100 text-slate-700 border-slate-200';
        dotColor = 'bg-slate-400';
        break;
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {isOverdue && norm !== 'PAID' ? 'OVERDUE' : norm}
    </span>
  );
};
