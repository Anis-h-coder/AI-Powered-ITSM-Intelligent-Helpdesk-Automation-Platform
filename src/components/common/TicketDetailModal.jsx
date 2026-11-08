
import React, { useState, useEffect } from 'react';
import { Modal } from './Modal.jsx';
import {
  PriorityBadge,
  StatusBadge,
  CategoryBadge,
  OriginBadge
} from './Badge.jsx';
import {
  Sparkles,
  ArrowUpRight,
  User,
  CheckCircle2
} from 'lucide-react';

const AGENTS = [
  'Unassigned',
  'Sarah Johnson',
  'Michael Chen',
  'David Wilson',
  'Emily Davis',
  'James Anderson',
  'Alex Morgan'
];

export function TicketDetailModal({
  ticket,
  isOpen,
  onClose,
  onUpdateStatus,
  onAssignAgent
}) {
  const [selectedAgent, setSelectedAgent] = useState('Unassigned');

  useEffect(() => {
    setSelectedAgent(ticket?.assignee || 'Unassigned');
  }, [ticket]);

  if (!ticket) return null;

  const handleAssignAgent = () => {
    if (!onAssignAgent) {
      console.error('Agent assignment handler is not available.');
      return;
    }

    onAssignAgent(ticket.id, selectedAgent);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Incident Record: ${ticket.id}`}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex flex-wrap items-center justify-between w-full gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
            <span>SLA Target: {ticket.slaDue || 'Not specified'}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {ticket.status !== 'Open' && (
              <button
                type="button"
                onClick={() => {
                  onUpdateStatus(ticket.id, 'Open');
                  onClose();
                }}
                className="px-2.5 py-1.5 text-xs bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg font-medium border border-sky-200 transition-colors"
              >
                Set Open
              </button>
            )}

            {ticket.status !== 'In Progress' && (
              <button
                type="button"
                onClick={() => {
                  onUpdateStatus(ticket.id, 'In Progress');
                  onClose();
                }}
                className="px-2.5 py-1.5 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-medium border border-indigo-200 transition-colors"
              >
                Set In Progress
              </button>
            )}

            {ticket.status !== 'Escalated' && (
              <button
                type="button"
                onClick={() => {
                  onUpdateStatus(ticket.id, 'Escalated');
                  onClose();
                }}
                className="px-2.5 py-1.5 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg font-medium border border-rose-200 flex items-center gap-1 transition-colors"
              >
                <ArrowUpRight className="w-3 h-3" />
                Escalate
              </button>
            )}

            {ticket.status !== 'Resolved' && (
              <button
                type="button"
                onClick={() => {
                  onUpdateStatus(ticket.id, 'Resolved');
                  onClose();
                }}
                className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-xs transition-colors"
              >
                Mark Resolved
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium ml-1 transition-colors border border-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs text-slate-700">

        {/* Title and Badges */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
            <CategoryBadge category={ticket.category} />
            <OriginBadge isUserCreated={ticket.isUserCreated} />

            {ticket.resolvedByAi && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200">
                <Sparkles className="w-3 h-3 text-purple-600" />
                AI-Resolved
              </span>
            )}
          </div>

          <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
            {ticket.title}
          </h2>
        </div>

        {/* Requester and Incident Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200">

          <div>
            <span className="text-[10px] font-semibold uppercase text-slate-500 block">
              Requester
            </span>
            <p className="font-semibold text-slate-900 mt-0.5 truncate">
              {ticket.requester}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {ticket.requesterEmail || 'internal user'}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase text-slate-500 block">
              Department
            </span>
            <p className="font-medium text-slate-900 mt-0.5 truncate">
              {ticket.department || 'Engineering'}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase text-slate-500 block">
              Assigned Group
            </span>
            <p className="font-medium text-slate-900 mt-0.5 truncate">
              {ticket.assignmentGroup || 'IT Support'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              Agent: {ticket.assignee || 'Unassigned'}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-semibold uppercase text-slate-500 block">
              Created At
            </span>
            <p className="font-mono text-slate-900 mt-0.5 truncate">
              {ticket.createdAt || 'Not available'}
            </p>
          </div>
        </div>

        {/* Agent Assignment */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold text-slate-800">
              Assign Incident to Agent
            </h4>
          </div>

          <p className="text-[11px] text-slate-500">
            Select an IT support agent responsible for handling this incident.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {AGENTS.map((agent) => (
                <option key={agent} value={agent}>
                  {agent}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleAssignAgent}
              disabled={selectedAgent === (ticket.assignee || 'Unassigned')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Assign Agent
            </button>
          </div>
        </div>

        {/* Problem Description */}
        <div>
          <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Problem Description &amp; Technical Scope
          </h4>

          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap shadow-inner">
            {ticket.description}
          </div>
        </div>

        {/* AI Triage Intelligence */}
        {ticket.aiTriage && (
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl p-3.5 space-y-2.5 shadow-md">

            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="flex items-center gap-1.5 font-bold text-cyan-300 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                AI-Based Issue Analysis (Simulation)
              </span>

              <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded">
                Confidence: {(ticket.aiTriage.confidence * 100).toFixed(0)}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Sentiment Evaluation
                </span>
                <p className="text-white font-medium">
                  {ticket.aiTriage.sentiment}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Predicted Category
                </span>
                <p className="text-white font-medium">
                  {ticket.aiTriage.predictedCategory}
                </p>
              </div>
            </div>

            <div className="pt-1 text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Match with an Approved Troubleshooting Guide
              </span>

              <p className="text-cyan-300 font-mono text-[11px] font-semibold mt-0.5">
                {ticket.aiTriage.recommendedRunbook}
              </p>

              <p className="text-slate-300 text-[11px] mt-0.5">
                {ticket.aiTriage.suggestedAction}
              </p>
            </div>
          </div>
        )}

        {/* Audit Trail */}
        <div className="pt-2 border-t border-slate-200">
          <span className="text-[10px] font-semibold uppercase text-slate-500 block mb-2">
            Audit Trail History
          </span>

          <div className="space-y-1.5 text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-500">
                {ticket.createdAt}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              <span>
                Ticket logged {ticket.isUserCreated
                  ? 'via Employee Self-Service (User Created)'
                  : 'from Production Operational records'}.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-500">
                {ticket.createdAt}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>
                AI Classifier auto-assigned category &amp; runbook mapping.
              </span>
            </div>

            {ticket.status === 'Escalated' && (
              <div className="flex items-center gap-2 text-rose-700 font-medium">
                <span className="font-mono text-rose-600">Escalated</span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>
                  Incident marked as Escalated for Tier 3 review.
                </span>
              </div>
            )}

            {ticket.status === 'Resolved' && (
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <span className="font-mono text-emerald-600">Resolved</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>
                  Incident marked as Resolved {ticket.resolvedByAi
                    ? 'by automated AI workflow'
                    : 'by technician'}.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
