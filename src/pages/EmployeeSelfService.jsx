import React, { useState } from 'react';
import {
  LifeBuoy,
  PlusCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Key,
  Laptop,
  ShieldCheck,
  Lock,
  ArrowRight,
  Send,
  Eye,
  Info,
  MessageSquare,
  Layers,
  ListFilter
} from 'lucide-react';
import { PriorityBadge, StatusBadge, CategoryBadge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { HelpdeskChatbot } from '../components/selfservice/HelpdeskChatbot.jsx';
import { SERVICE_CATALOG } from '../data/mockData.js';

const ICON_MAP = {
  Key: Key,
  Laptop: Laptop,
  ShieldCheck: ShieldCheck,
  Lock: Lock,
};

export function EmployeeSelfService({
  tickets = [],
  softwareRequests = [],
  onAddTicket,
  onAddSoftwareRequest,
  onOpenTicketModal
}) {
  // Navigation tabs within Employee Self-Service: 'chatbot', 'catalog', 'manual-ticket', 'my-tickets'
  const [activePortalTab, setActivePortalTab] = useState('chatbot');

  // Manual Ticket Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Network & VPN');
  const [priority, setPriority] = useState('P3 - Medium');
  const [department, setDepartment] = useState('Software Engineering');
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null);
  const [catalogRequestNotes, setCatalogRequestNotes] = useState('');
  const [submissionSuccessMessage, setSubmissionSuccessMessage] = useState(null);

  // Simulated AI recommendation based on manual ticket description text
  const getAiSuggestion = () => {
    const text = (title + ' ' + description).toLowerCase();
    if (!text.trim() || text.length < 10) return null;

    if (text.includes('vpn') || text.includes('tunnel') || text.includes('handshake') || text.includes('wifi')) {
      return {
        category: 'Network & VPN',
        confidence: '95%',
        articleId: 'KB-4102',
        articleTitle: 'Resolving macOS Sequoia GlobalProtect VPN Handshake Timeouts',
        action: 'Recommended Fix: Push MTU 1360 configuration script',
      };
    }
    if (text.includes('okta') || text.includes('mfa') || text.includes('push') || text.includes('password') || text.includes('login')) {
      return {
        category: 'Identity & SSO',
        confidence: '92%',
        articleId: 'KB-2904',
        articleTitle: 'Emergency Okta MFA Re-Enrollment and Bypass Procedures',
        action: 'Recommended Fix: Issue 24-hr hardware passkey or OTP self-service',
      };
    }
    if (text.includes('copilot') || text.includes('license') || text.includes('github') || text.includes('figma') || text.includes('code')) {
      return {
        category: 'Software Access',
        confidence: '97%',
        articleId: 'KB-3891',
        articleTitle: 'Requesting & Configuring Developer Software Seats',
        action: 'Recommended Fix: Pre-approved automated Okta SCIM sync',
      };
    }
    if (text.includes('battery') || text.includes('laptop') || text.includes('macbook') || text.includes('screen') || text.includes('hardware')) {
      return {
        category: 'Hardware',
        confidence: '94%',
        articleId: 'KB-1740',
        articleTitle: 'Standard Laptop Depot Hardware Swap & Return Protocol',
        action: 'Recommended Fix: Book smart locker hardware depot pickup',
      };
    }
    return {
      category: 'General IT Inquiry',
      confidence: '82%',
      articleId: 'KB-0100',
      articleTitle: 'IT Service Catalog & Escalation Pathways',
      action: 'Automated Tier 1 routing queue assigned',
    };
  };

  const aiSuggestion = getAiSuggestion();

  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  const handleSubmitManualTicket = async (e) => {
    e.preventDefault();

    if (!title.trim() || !description.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmissionError('');
    setSubmissionSuccessMessage(null);

    try {
      const newTicket = {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        department,
        requester: 'Sarah Chen (Current User)',
        requesterEmail: 'sarah.chen@enterprise.internal',
        requester_email: 'sarah.chen@enterprise.internal',
        status: 'New',
        assignee: 'Unassigned',
        assignmentGroup:
          category === 'Network & VPN'
            ? 'Network Engineering Tier 2'
            : category === 'Software Access'
              ? 'IT Asset Management'
              : category === 'Identity & SSO'
                ? 'Identity & Access Mgmt'
                : category === 'Hardware'
                  ? 'Endpoint Hardware Depot'
                  : 'IT Service Desk Tier 1',
        isUserCreated: true,
        resolvedByAi: false,
      };

      // Parent callback should save the incident through FastAPI.
      await onAddTicket(newTicket);

      setTitle('');
      setDescription('');
      setSubmissionSuccessMessage({
        id: 'Incident submitted',
        title: newTicket.title,
        sla: priority.includes('P1')
          ? '30 mins'
          : priority.includes('P2')
            ? '2 hours'
            : '8 hours',
      });

      setActivePortalTab('my-tickets');
    } catch (error) {
      console.error('Incident submission failed:', error);
      setSubmissionError(
        error?.message || 'Incident could not be saved. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCatalogRequestSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCatalogItem) return;

    const catalogItem = selectedCatalogItem;

    try {
      if (catalogItem.isSoftware) {
        const newSoftwareRequest = {
          requestedSoftware: catalogItem.title,
          requester: 'Sarah Chen (Current User)',
          department: 'Software Engineering',
          status: 'Provisioning',
          businessJustification:
            catalogRequestNotes ||
            'Self-service catalog fast-track approval.',
        };

        // Backend-la save aagura varaikkum wait pannum
        const savedRequest = await onAddSoftwareRequest(newSoftwareRequest);

        if (!savedRequest?.id) {
          throw new Error('Software request ID was not returned by the backend.');
        }

        setSelectedCatalogItem(null);
        setCatalogRequestNotes('');

        setSubmissionSuccessMessage({
          id: savedRequest.id,
          title: catalogItem.title,
          sla: catalogItem.deliveryTime,
        });

        return;
      }

      const newTicket = {
        title: `Service Request: ${catalogItem.title}`,
        description: `Catalog request for ${catalogItem.title}. User justification: ${
          catalogRequestNotes || 'Standard employee operational access'
        }`,
        requester: 'Sarah Chen (Current User)',
        requesterEmail: 'sarah.chen@enterprise.internal',
        category: catalogItem.category,
        priority: 'Low',
      };

      // Actual incident ID backend-lendhu varum
      const savedTicket = await onAddTicket(newTicket);

      if (!savedTicket?.id) {
        throw new Error('Incident ID was not returned by the backend.');
      }

      setSelectedCatalogItem(null);
      setCatalogRequestNotes('');

      setSubmissionSuccessMessage({
        id: savedTicket.id,
        title: newTicket.title,
        sla: catalogItem.deliveryTime,
      });
    } catch (error) {
      console.error('Catalog submission failed:', error);

      window.alert(
        `Request submit aagala. ${
          error?.message || 'Please try again.'
        }`
      );
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Banner with Clean White Design */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white border border-slate-200/90 p-4 sm:p-6 rounded-2xl shadow-xs relative overflow-hidden">
        {/* Subtle top ambient accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500"></div>

        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-xs">
              <LifeBuoy className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Employee Self-Service Portal</h2>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 font-mono">
              Live Portal
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xl">
            Employees can report IT problems, get troubleshooting guidance, request approved software and track their tickets.
          </p>
        </div>

        {/* Navigation Tabs - Horizontally scrollable on mobile */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar w-full lg:w-auto">
          <button
            onClick={() => setActivePortalTab('chatbot')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all shrink-0 ${
              activePortalTab === 'chatbot'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Helpdesk Chatbot</span>
          </button>

          <button
            onClick={() => setActivePortalTab('catalog')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all shrink-0 ${
              activePortalTab === 'catalog'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Service Catalog</span>
          </button>

          <button
            onClick={() => setActivePortalTab('manual-ticket')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all shrink-0 ${
              activePortalTab === 'manual-ticket'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Manual Form</span>
          </button>

          <button
            onClick={() => setActivePortalTab('my-tickets')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all shrink-0 ${
              activePortalTab === 'my-tickets'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>My Tickets ({tickets.length})</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="flex items-center gap-2.5 sm:gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
        <Info className="w-4 h-4 text-blue-600 shrink-0" />
        <p className="leading-relaxed">
          <span className="font-semibold text-blue-900">Employee Portal:</span> You can report IT problems, chat with the IT assistant for guided troubleshooting, request approved software, and track active tickets.
        </p>
      </div>

      {/* Success Notification Alert */}
      {submissionSuccessMessage && (
        <div className="flex items-start justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 text-sm">
                Ticket Created: {submissionSuccessMessage.id}
              </p>
              <p className="text-emerald-800 mt-0.5">{submissionSuccessMessage.title}</p>
              <p className="text-emerald-700 text-[11px] mt-1 font-mono">
                Target Resolution SLA: {submissionSuccessMessage.sla} • Status: Synced to ITSM Dashboard Queue
              </p>
            </div>
          </div>
          <button
            onClick={() => setSubmissionSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-medium px-2 py-1 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. CHATBOT TAB (DEFAULT HERO EXPERIENCE) */}
      {activePortalTab === 'chatbot' && (
        <div className="space-y-4">
          <HelpdeskChatbot
            tickets={tickets}
            softwareRequests={softwareRequests}
            onAddTicket={onAddTicket}
            onAddSoftwareRequest={onAddSoftwareRequest}
            onOpenTicketModal={onOpenTicketModal}
          />
        </div>
      )}

      {/* 2. SERVICE CATALOG TAB */}
      {activePortalTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
              Enterprise Service Catalog Items
            </h3>
            <span className="text-xs text-slate-500">Fast-track automated approvals</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SERVICE_CATALOG.map((cat) => {
              const IconComponent = ICON_MAP[cat.icon] || LifeBuoy;
              return (
                <div
                  key={cat.id}
                  className="bg-white border border-slate-200/90 hover:border-blue-400 rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:shadow-md transition-all duration-200 group card-elevate"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                        {cat.badge}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight mb-1.5 group-hover:text-blue-600 transition-colors">
                      {cat.title}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500">{cat.deliveryTime}</span>
                    <button
                      onClick={() => setSelectedCatalogItem(cat)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                    >
                      Request <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. MANUAL TICKET FORM TAB */}
      {activePortalTab === 'manual-ticket' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ticket Form */}
          <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
              <PlusCircle className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Submit an IT Incident or Assistance Request
              </h3>
            </div>

            <form onSubmit={handleSubmitManualTicket} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Issue Summary / Subject <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cannot connect to corporate VPN after macOS update"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-2.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  >
                    <option value="Network & VPN">Network & VPN</option>
                    <option value="Software Access">Software Access</option>
                    <option value="Identity & SSO">Identity & SSO</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Email & O365">Email & O365</option>
                    <option value="Cloud Infrastructure">Cloud Infrastructure</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Urgency / Impact</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-2.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  >
                    <option value="P4 - Low">P4 - Low (Non-blocking inquiry)</option>
                    <option value="P3 - Medium">P3 - Medium (Workaround available)</option>
                    <option value="P2 - High">P2 - High (Significant degradation)</option>
                    <option value="P1 - Critical">P1 - Critical (Entire service down)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-2.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  >
                    <option value="Software Engineering">Software Engineering</option>
                    <option value="Cloud Platform Eng">Cloud Platform Eng</option>
                    <option value="Design Systems">Design Systems</option>
                    <option value="Finance Operations">Finance Operations</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Sales & Field Ops">Sales & Field Ops</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Detailed Description &amp; Error Logs <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Include steps to reproduce, error codes (e.g. 0x80040115), terminal logs, or device model..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600 focus:border-blue-600 font-mono"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <span className="text-[11px] text-slate-500">
                  Assignee routing determined by triage model
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>             
              {submissionError && (
                <p role="alert" className="text-xs text-red-600">
                  {submissionError}
                </p>
              )}
            </form>
          </div>

          {/* Real-time AI Triage Helper Card (Sleek High-Contrast Dark Card) */}
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  AI Triage Copilot (Simulated)
                </h4>
              </div>

              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                As you describe the technical issue, the intelligent helpdesk pipeline classifies and matches known runbooks in real time.
              </p>

              {aiSuggestion ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase text-cyan-400 font-mono">
                      Detected Category
                    </span>
                    <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.5 rounded">
                      Confidence: {aiSuggestion.confidence}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-white">
                    {aiSuggestion.category}
                  </p>

                  <div className="pt-2 border-t border-slate-800 text-xs">
                    <span className="text-[11px] font-medium text-slate-400 block mb-1">
                      Matched Self-Service Solution:
                    </span>
                    <p className="text-xs font-semibold text-cyan-300 hover:underline cursor-pointer">
                      {aiSuggestion.articleTitle} ({aiSuggestion.articleId})
                    </p>
                    <p className="text-[11px] text-slate-300 mt-1">
                      {aiSuggestion.action}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-xl p-6 text-center">
                  <FileText className="w-7 h-7 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Type a subject or description to see real-time simulated AI categorization &amp; runbook recommendations.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Average Automated Triage Time: ~1.2s</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. MY TICKETS & REQUESTS TABLE VIEW */}
      {activePortalTab === 'my-tickets' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden space-y-4">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">My IT Incident &amp; Request Records</h3>
              <p className="text-xs text-slate-500">Synchronized with the ITSM Dashboard queue in shared memory</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 font-semibold">
                {tickets.length} Incidents • {softwareRequests.length} Software Requests
              </span>
            </div>
          </div>

          {/* Incident Tickets */}
          <div className="px-4 sm:px-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Incident Records ({tickets.length})
            </h4>

            {/* Mobile Cards View (< md) */}
            <div className="md:hidden space-y-3">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onOpenTicketModal(t)}
                  className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 cursor-pointer space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-600">{t.id}</span>
                    <PriorityBadge priority={t.priority} />
                  </div>
                  <p className="text-xs font-semibold text-slate-900 line-clamp-1">{t.title}</p>
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                    <StatusBadge status={t.status} />
                    <span className="font-mono">SLA: {t.slaDue}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Reference ID</th>
                    <th className="px-4 py-3">Summary</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">SLA Due</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 whitespace-nowrap">
                        {t.id}
                      </td>
                      <td className="px-4 py-3 max-w-xs font-medium text-slate-900 truncate">
                        {t.title}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <CategoryBadge category={t.category} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                        {t.slaDue}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => onOpenTicketModal(t)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Incident Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Software Requests List */}
          <div className="px-4 sm:px-6 pb-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Software Entitlement Requests ({softwareRequests.length})
            </h4>

            {/* Mobile Cards View (< md) */}
            <div className="md:hidden space-y-3">
              {softwareRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-600">{req.id}</span>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-xs font-bold text-slate-900">{req.requestedSoftware}</p>
                  <p className="text-[11px] text-slate-500 truncate">{req.provisioningLog || 'Automated queue.'}</p>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Request ID</th>
                    <th className="px-4 py-3">Requested Software</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted At</th>
                    <th className="px-4 py-3">Provisioning Pipeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {softwareRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 whitespace-nowrap">
                        {req.id}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        {req.requestedSoftware}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {req.submittedAt}
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-xs">
                        <p className="truncate max-w-xs">{req.provisioningLog || 'Automated Jamf/Intune queue.'}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Catalog Item Request Modal */}
      {selectedCatalogItem && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCatalogItem(null)}
          title={`Service Catalog Request: ${selectedCatalogItem.title}`}
          footer={
            <>
              <button
                type="button"
                onClick={() => setSelectedCatalogItem(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCatalogRequestSubmit}
                className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs"
              >
                Submit Entitlement Request
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <p className="font-bold text-slate-900 text-sm">{selectedCatalogItem.title}</p>
              <p className="text-slate-600 mt-1 leading-relaxed">{selectedCatalogItem.description}</p>
              <p className="text-slate-500 text-[11px] mt-2 font-mono">
                Estimated Delivery SLA: <span className="text-blue-700 font-semibold">{selectedCatalogItem.deliveryTime}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Business Justification / Project Need
              </label>
              <textarea
                rows={3}
                placeholder="Explain why this hardware or software license is needed for your current project duties..."
                value={catalogRequestNotes}
                onChange={(e) => setCatalogRequestNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>

            <div className="text-[11px] text-blue-900 bg-blue-50 p-3 rounded-xl border border-blue-200">
              <span className="font-semibold text-blue-800">Automated Triage:</span> If pre-approved, this request initiates automated software deployment without manual steps.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
