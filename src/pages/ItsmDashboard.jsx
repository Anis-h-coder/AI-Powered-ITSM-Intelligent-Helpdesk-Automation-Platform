import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Cpu,
  Filter,
  Search,
  Eye,
  RefreshCw,
  MoreVertical,
  Layers,
  ArrowUpDown,
  Laptop,
  Check,
  XCircle,
  Activity,
  ShieldCheck,
  FileText,
  AlertOctagon,
  ArrowUpRight,
  Database,
  Zap
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard.jsx';
import { PriorityBadge, StatusBadge, CategoryBadge, OriginBadge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';

export function ItsmDashboard({
  tickets = [],
  softwareRequests = [],
  auditLogs = [],
  onUpdateTicketStatus,
  onUpdateSoftwareRequestStatus,
  onOpenTicketModal,
  onNavigateToAutoResolution
}) {
  // Ticket Filtering & Sorting State
  const [ticketSearch, setTicketSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'

  // Software Requests Filter State
  const [reqStatusFilter, setReqStatusFilter] = useState('ALL');
  const [reqSearch, setReqSearch] = useState('');
  const [selectedSoftwareReq, setSelectedSoftwareReq] = useState(null);

  // Active Tab within Dashboard: 'all-views' | 'tickets' | 'software' | 'audit'
  const [activeSection, setActiveSection] = useState('all-views');

  // ==========================================
  // METRIC CALCULATIONS
  // ==========================================
  const totalTicketsCount = tickets.length;

  const openTicketsCount = tickets.filter((t) =>
    ['Open', 'New', 'In Progress', 'Assigned', 'In Triage', 'Pending IT Action'].includes(t.status)
  ).length;

  const aiResolvedTicketsCount = tickets.filter(
    (t) => t.status === 'Resolved' && (t.resolvedByAi || t.assignee?.toLowerCase().includes('ai'))
  ).length;

  const escalatedTicketsCount = tickets.filter((t) => t.status === 'Escalated').length;

  const totalSoftwareRequestsCount = softwareRequests.length;

  const completedAttempts = auditLogs.filter(
    (l) => l.executionStatus === 'Success' || l.executionStatus === 'Failed'
  );
  const successfulAttempts = auditLogs.filter((l) => l.executionStatus === 'Success');
  const automationSuccessRate =
    completedAttempts.length > 0
      ? `${((successfulAttempts.length / completedAttempts.length) * 100).toFixed(1)}%`
      : 'N/A';

  const userCreatedIncidents = tickets.filter((t) => t.isUserCreated).length;
  const userCreatedSoftware = softwareRequests.filter((r) => r.isUserCreated).length;

  // Filtering & Sorting Tickets
  const filteredTickets = tickets
    .filter((t) => {
      if (priorityFilter !== 'ALL' && !t.priority?.startsWith(priorityFilter)) return false;

      if (statusFilter !== 'ALL') {
        if (statusFilter === 'Open' && !['Open', 'New'].includes(t.status)) return false;
        if (statusFilter === 'In Progress' && t.status !== 'In Progress') return false;
        if (statusFilter === 'Escalated' && t.status !== 'Escalated') return false;
        if (statusFilter === 'Resolved' && t.status !== 'Resolved') return false;
      }

      if (ticketSearch.trim()) {
        const q = ticketSearch.toLowerCase();
        const matchId = t.id?.toLowerCase().includes(q);
        const matchTitle = t.title?.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchReq = t.requester?.toLowerCase().includes(q);
        const matchGroup = t.assignmentGroup?.toLowerCase().includes(q);
        if (!matchId && !matchTitle && !matchDesc && !matchReq && !matchGroup) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime() || 0;
      const timeB = new Date(b.createdAt || 0).getTime() || 0;
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

  // Filtering Software Requests
  const filteredSoftwareRequests = softwareRequests.filter((req) => {
    if (reqStatusFilter !== 'ALL' && req.status !== reqStatusFilter) return false;
    if (reqSearch.trim()) {
      const q = reqSearch.toLowerCase();
      const matchSoftware = req.requestedSoftware?.toLowerCase().includes(q);
      const matchReq = req.requester?.toLowerCase().includes(q);
      const matchId = req.id?.toLowerCase().includes(q);
      if (!matchSoftware && !matchReq && !matchId) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. TOP METRICS STRIP */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              ITSM Dashboard
              <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 uppercase font-semibold">
                IT Operations
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              IT support teams can view tickets, check priorities, monitor service targets and track issue status.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg font-medium">
              Simulation Environment Active
            </span>
          </div>
        </div>
      </div>

      {/* 6 Responsive Metric Stat Cards (All Dark Theme Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="Total Incidents"
          value={totalTicketsCount}
          change={`${userCreatedIncidents} via Portal`}
          changeType="neutral"
          subtitle="All active records"
          icon={Activity}
          variant="dark"
        />
        <StatCard
          title="Open Queue"
          value={openTicketsCount}
          change={`${((openTicketsCount / (totalTicketsCount || 1)) * 100).toFixed(0)}% backlog`}
          changeType="negative"
          subtitle="Under review & in progress"
          icon={Clock}
          variant="dark"
        />
        <StatCard
          title="AI-Resolved"
          value={aiResolvedTicketsCount}
          change={`${((aiResolvedTicketsCount / (totalTicketsCount || 1)) * 100).toFixed(0)}% deflected`}
          changeType="positive"
          subtitle="Automated issue resolution"
          icon={Cpu}
          variant="dark"
        />
        <StatCard
          title="Escalated Tickets"
          value={escalatedTicketsCount}
          change="Requires human action"
          changeType={escalatedTicketsCount > 0 ? 'negative' : 'positive'}
          subtitle="Human approval when needed"
          icon={AlertTriangle}
          variant="dark"
        />
        <StatCard
          title="Software Requests"
          value={totalSoftwareRequestsCount}
          change={`${userCreatedSoftware} via Portal`}
          changeType="neutral"
          subtitle="Catalog approval queue"
          icon={Laptop}
          variant="dark"
        />
        <StatCard
          title="Automation Success"
          value={automationSuccessRate}
          change={`${successfulAttempts.length} of ${completedAttempts.length} runs`}
          changeType="positive"
          subtitle="Simulated fix success"
          icon={ShieldCheck}
          variant="dark"
        />
      </div>

      {/* Navigation Filter Tabs for Dashboard Views */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveSection('all-views')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
              activeSection === 'all-views'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            All Queues &amp; Activity
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('tickets')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
              activeSection === 'tickets'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Incident Queue ({filteredTickets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('software')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
              activeSection === 'software'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Software Requests ({filteredSoftwareRequests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('audit')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
              activeSection === 'audit'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Automation Audit Log ({auditLogs.length})
          </button>
        </div>

        <span className="text-[11px] text-slate-400 hidden lg:inline font-mono">
          Dynamic Data Sync • Session Memory
        </span>
      </div>

      {/* 2. RECENT TICKETS TABLE */}
      {(activeSection === 'all-views' || activeSection === 'tickets') && (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {/* Table Toolbar Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Incident Tickets Queue</h3>
                <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                  {filteredTickets.length} of {tickets.length} Records
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Search, filter by priority and status, and transition states directly.
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by ID or summary..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
              >
                <option value="ALL">All Priorities</option>
                <option value="P1">P1 - Critical</option>
                <option value="P2">P2 - High</option>
                <option value="P3">P3 - Medium</option>
                <option value="P4">P4 - Low</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
              >
                <option value="ALL">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Escalated">Escalated</option>
                <option value="Resolved">Resolved</option>
              </select>

              {/* Sort Order */}
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-xs text-slate-700 flex items-center gap-1 font-medium transition-colors"
                title="Sort by creation time"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                <span>{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
              </button>

              {/* Reset */}
              {(ticketSearch || priorityFilter !== 'ALL' || statusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setTicketSearch('');
                    setPriorityFilter('ALL');
                    setStatusFilter('ALL');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium text-xs px-1"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Mobile Cards View (< md) */}
          <div className="md:hidden p-3 space-y-3">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => onOpenTicketModal(ticket)}
                className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 cursor-pointer space-y-2 shadow-xs transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600">{ticket.id}</span>
                    <OriginBadge isUserCreated={ticket.isUserCreated} />
                  </div>
                  <PriorityBadge priority={ticket.priority} />
                </div>
                <p className="text-xs font-bold text-slate-900 line-clamp-1">{ticket.title}</p>
                <p className="text-[11px] text-slate-500 line-clamp-1">{ticket.description}</p>
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <StatusBadge status={ticket.status} />
                  <span className="font-mono text-slate-500">{ticket.assignmentGroup}</span>
                </div>
              </div>
            ))}
            {filteredTickets.length === 0 && (
              <p className="text-center text-slate-400 text-xs py-6">No matching incidents found.</p>
            )}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[800px]">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Ticket ID</th>
                  <th className="px-4 py-3">Summary</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assignment Group</th>
                  <th className="px-4 py-3">Created Time</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Ticket ID & Origin Badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono font-bold text-blue-600">
                          {ticket.id}
                        </span>
                        <OriginBadge isUserCreated={ticket.isUserCreated} />
                      </div>
                    </td>

                    {/* Summary */}
                    <td className="px-4 py-3 max-w-xs sm:max-w-sm">
                      <p className="font-semibold text-slate-900 truncate">
                        {ticket.title}
                      </p>
                      <p className="text-slate-500 text-[11px] truncate mt-0.5">
                        {ticket.description}
                      </p>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <CategoryBadge category={ticket.category} />
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <PriorityBadge priority={ticket.priority} />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={ticket.status} />
                        {ticket.resolvedByAi && (
                          <span
                            title="Resolved by AI automated workflow"
                            className="inline-flex items-center text-[10px] text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200"
                          >
                            AI
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Assignment Group */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-medium text-slate-900">{ticket.assignmentGroup}</p>
                      <p className="text-[10px] text-slate-500">Owner: {ticket.assignee}</p>
                    </td>

                    {/* Created Time */}
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {ticket.createdAt}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Auto-Remediate Shortcut */}
                        {onNavigateToAutoResolution && (
                          <button
                            type="button"
                            onClick={() => onNavigateToAutoResolution(ticket.id)}
                            className="px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-xs font-semibold border border-emerald-200 flex items-center gap-1 transition-colors"
                            title="Launch Auto-Resolution & Self-Heal Agent"
                          >
                            <Zap className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Self-Heal</span>
                          </button>
                        )}

                        {/* View Details */}
                        <button
                          type="button"
                          onClick={() => onOpenTicketModal(ticket)}
                          className="px-2.5 py-1 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium border border-slate-200 transition-colors"
                          title="Inspect incident record details"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. SOFTWARE REQUESTS QUEUE */}
      {(activeSection === 'all-views' || activeSection === 'software') && (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div>
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Software Access &amp; Entitlements Queue</h3>
                <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                  {filteredSoftwareRequests.length} Total
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Provisioning pipeline connected to Employee Self-Service submissions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter software, requester..."
                  value={reqSearch}
                  onChange={(e) => setReqSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <select
                value={reqStatusFilter}
                onChange={(e) => setReqStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
              >
                <option value="ALL">All States</option>
                <option value="Pending">Pending</option>
                <option value="Provisioning">Provisioning</option>
                <option value="Completed">Completed</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Mobile View */}
          <div className="md:hidden p-3 space-y-3">
            {filteredSoftwareRequests.map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-600">{req.id}</span>
                  <StatusBadge status={req.status} />
                </div>
                <p className="text-xs font-bold text-slate-900">{req.requestedSoftware}</p>
                <p className="text-[11px] text-slate-500">Requester: {req.requester} ({req.department})</p>
                <div className="pt-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setSelectedSoftwareReq(req)}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    View Log
                  </button>
                  <select
                    value={req.status}
                    onChange={(e) => onUpdateSoftwareRequestStatus(req.id, e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-[11px] text-slate-700"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Provisioning">Provisioning</option>
                    <option value="Completed">Completed</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Software Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Request ID</th>
                  <th className="px-4 py-3">Requested Software</th>
                  <th className="px-4 py-3">Requester &amp; Dept</th>
                  <th className="px-4 py-3">Request Status</th>
                  <th className="px-4 py-3">Submitted Time</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSoftwareRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* ID & Origin */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono font-bold text-blue-600">{req.id}</span>
                        <OriginBadge isUserCreated={req.isUserCreated} />
                      </div>
                    </td>

                    {/* Requested Software */}
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-[10px]">
                          {req.requestedSoftware?.charAt(0) || 'S'}
                        </div>
                        <span>{req.requestedSoftware}</span>
                      </div>
                    </td>

                    {/* Requester & Dept */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-medium text-slate-900">{req.requester}</p>
                      <p className="text-[10px] text-slate-500">{req.department || 'Engineering'}</p>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={req.status} />
                    </td>

                    {/* Submitted Time */}
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {req.submittedAt}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedSoftwareReq(req)}
                          className="px-2.5 py-1 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium border border-slate-200 transition-colors"
                        >
                          View Log
                        </button>

                        <select
                          value={req.status}
                          onChange={(e) => onUpdateSoftwareRequestStatus(req.id, e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                          title="Transition Provisioning State"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Provisioning">Provisioning</option>
                          <option value="Completed">Completed</option>
                          <option value="Failed">Failed</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. AUTOMATION ACTIVITY & AUDIT LOG */}
      {(activeSection === 'all-views' || activeSection === 'audit') && (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Automation Activity &amp; Audit Log</h3>
                <p className="text-[11px] text-slate-500">
                  Telemetry for automated triage, zero-touch provisioning, and self-service unlocks.
                </p>
              </div>
            </div>

            <span className="text-[11px] font-mono text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 font-semibold">
              {auditLogs.length} Events Recorded
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Automated Action</th>
                  <th className="px-4 py-3">Related Ticket / Request</th>
                  <th className="px-4 py-3">Execution Status</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Result / Validation Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Action */}
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                        <span>{log.automatedAction}</span>
                      </div>
                    </td>

                    {/* Related Item */}
                    <td className="px-4 py-3 font-mono text-blue-600 whitespace-nowrap font-medium">
                      {log.relatedItem || 'GLOBAL'}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                          log.executionStatus === 'Success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.executionStatus === 'Failed'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {log.executionStatus === 'Success' ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-rose-600" />
                        )}
                        <span>{log.executionStatus}</span>
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {log.timestamp}
                    </td>

                    {/* Result */}
                    <td className="px-4 py-3 text-slate-700 text-xs">
                      <p className="line-clamp-2">{log.result}</p>
                      {log.isSimulated && (
                        <span className="text-[10px] text-slate-400 italic block mt-0.5">
                          (Simulated audit record - technical assessment mode)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Software Request Detail Modal */}
      {selectedSoftwareReq && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSoftwareReq(null)}
          title={`Software Request Detail: ${selectedSoftwareReq.id}`}
          maxWidth="max-w-lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-500 font-mono">
                Status: {selectedSoftwareReq.status}
              </span>
              <button
                type="button"
                onClick={() => setSelectedSoftwareReq(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-3.5 text-xs text-slate-700">
            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                  Application
                </span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {selectedSoftwareReq.requestedSoftware}
                </p>
              </div>
              <StatusBadge status={selectedSoftwareReq.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                  Requester
                </span>
                <p className="font-semibold text-slate-900 mt-0.5">{selectedSoftwareReq.requester}</p>
                <p className="text-[11px] text-slate-500">{selectedSoftwareReq.department}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                  Submitted At
                </span>
                <p className="font-mono text-slate-900 mt-0.5">{selectedSoftwareReq.submittedAt}</p>
              </div>
            </div>

            {/* Terminal log inside modal: sleek dark technical card */}
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                Provisioning Log &amp; Verification
              </span>
              <div className="bg-slate-900 border border-slate-800 text-cyan-300 font-mono p-3 rounded-xl text-[11px] leading-relaxed shadow-inner">
                {selectedSoftwareReq.provisioningLog || 'Standard automated deployment queued in Jamf/Intune.'}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl text-[11px] text-blue-900">
              <span className="font-semibold">Workflow Status:</span> Software requests synchronize across the Employee Self-Service Portal and the ITSM Dashboard in shared memory.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
