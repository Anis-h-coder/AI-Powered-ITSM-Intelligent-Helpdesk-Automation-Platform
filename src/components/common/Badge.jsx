import React from 'react';

export function PriorityBadge({ priority }) {
  let colorStyle = 'bg-slate-100 text-slate-700 border-slate-200';

  if (!priority) return null;

  if (priority.includes('P1') || priority.toLowerCase().includes('critical')) {
    colorStyle = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
  } else if (priority.includes('P2') || priority.toLowerCase().includes('high')) {
    colorStyle = 'bg-amber-50 text-amber-800 border-amber-200 font-bold';
  } else if (priority.includes('P3') || priority.toLowerCase().includes('medium')) {
    colorStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold';
  } else if (priority.includes('P4') || priority.toLowerCase().includes('low')) {
    colorStyle = 'bg-slate-100 text-slate-700 border-slate-200 font-medium';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono border ${colorStyle}`}>
      {priority}
    </span>
  );
}

export function StatusBadge({ status }) {
  let dotColor = 'bg-slate-400';
  let textColor = 'text-slate-700 bg-slate-100 border-slate-200';

  switch (status) {
    case 'New':
    case 'Open':
      dotColor = 'bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.4)]';
      textColor = 'text-cyan-800 bg-cyan-50 border-cyan-200';
      break;
    case 'In Progress':
    case 'Assigned':
      dotColor = 'bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.4)]';
      textColor = 'text-indigo-800 bg-indigo-50 border-indigo-200';
      break;
    case 'In Triage':
      dotColor = 'bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.4)]';
      textColor = 'text-purple-800 bg-purple-50 border-purple-200';
      break;
    case 'Pending':
    case 'Pending IT Action':
    case 'Pending Vendor':
      dotColor = 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]';
      textColor = 'text-amber-800 bg-amber-50 border-amber-200';
      break;
    case 'Provisioning':
      dotColor = 'bg-sky-500 animate-pulse';
      textColor = 'text-sky-800 bg-sky-50 border-sky-200';
      break;
    case 'Completed':
    case 'Resolved':
    case 'Closed':
      dotColor = 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]';
      textColor = 'text-emerald-800 bg-emerald-50 border-emerald-200';
      break;
    case 'Escalated':
      dotColor = 'bg-rose-500 animate-pulse';
      textColor = 'text-rose-800 bg-rose-50 border-rose-200 font-semibold';
      break;
    case 'Failed':
      dotColor = 'bg-rose-500';
      textColor = 'text-rose-800 bg-rose-50 border-rose-200';
      break;
    default:
      dotColor = 'bg-slate-400';
      textColor = 'text-slate-700 bg-slate-100 border-slate-200';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${textColor}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
      {status}
    </span>
  );
}

export function CategoryBadge({ category }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
      {category}
    </span>
  );
}

export function OriginBadge({ isUserCreated }) {
  if (isUserCreated) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
        User Created
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 font-mono">
      System Record
    </span>
  );
}

export function RiskBadge({ risk }) {
  let color = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';
  const r = (risk || '').toLowerCase();

  if (r.includes('low')) {
    color = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    dotColor = 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]';
  } else if (r.includes('medium')) {
    color = 'bg-amber-50 text-amber-800 border-amber-200';
    dotColor = 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]';
  } else if (r.includes('high') || r.includes('critical')) {
    color = 'bg-rose-50 text-rose-800 border-rose-200 font-bold';
    dotColor = 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
      {risk}
    </span>
  );
}

export function ExecutionBadge({ status }) {
  let color = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';
  const s = (status || '').toLowerCase();

  if (s.includes('success') || s.includes('completed')) {
    color = 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs';
    dotColor = 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]';
  } else if (s.includes('executing') || s.includes('running')) {
    color = 'bg-purple-50 text-purple-800 border-purple-200 animate-pulse';
    dotColor = 'bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.4)]';
  } else if (s.includes('pending') || s.includes('approval')) {
    color = 'bg-amber-50 text-amber-800 border-amber-200';
    dotColor = 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]';
  } else if (s.includes('approved')) {
    color = 'bg-sky-50 text-sky-800 border-sky-200';
    dotColor = 'bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.4)]';
  } else if (s.includes('failed') || s.includes('rejected') || s.includes('escalated')) {
    color = 'bg-rose-50 text-rose-800 border-rose-200 font-bold';
    dotColor = 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
      {status}
    </span>
  );
}
