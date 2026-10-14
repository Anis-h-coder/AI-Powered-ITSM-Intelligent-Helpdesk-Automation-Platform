import React, { useState, useMemo, useEffect } from 'react';
import {
  Zap,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  BookOpen,
  Cpu,
  Lock,
  ArrowRight,
  Clock,
  Search,
  Filter,
  Layers,
  Sparkles,
  ExternalLink,
  UserCheck,
  Server,
  FileText,
  AlertOctagon,
  HelpCircle,
  Activity,
  Check,
  X
} from 'lucide-react';
import { PriorityBadge, StatusBadge, CategoryBadge, RiskBadge, ExecutionBadge } from '../components/common/Badge.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { StatCard } from '../components/common/StatCard.jsx';
import { DEMO_SELF_HEAL_SCENARIOS } from '../data/selfHealScenarios.js';
import { api } from '../services/api.js';

export function AutoResolution({
  tickets = [],
  softwareRequests = [],
  auditLogs = [],
  onUpdateTicketStatus,
  onUpdateSoftwareRequestStatus,
  onAddAuditLog,
  onNavigateTab,
  onOpenTicketModal,
  preselectedTicketId = null,
}) {
  // Active selected scenario ID
  const [selectedScenarioId, setSelectedScenarioId] = useState(DEMO_SELF_HEAL_SCENARIOS[0].id);

  // Custom ticket selection mode vs Pre-configured scenario mode
  const [sourceMode, setSourceMode] = useState(preselectedTicketId ? 'active-tickets' : 'scenarios');
  const [selectedTicketId, setSelectedTicketId] = useState(preselectedTicketId || tickets[0]?.id || '');
  const [ticketSearch, setTicketSearch] = useState('');

  useEffect(() => {
    if (preselectedTicketId) {
      setSourceMode('active-tickets');
      setSelectedTicketId(preselectedTicketId);
    }
  }, [preselectedTicketId]);

  useEffect(() => {
    if (sourceMode === 'active-tickets' && !selectedTicketId && tickets.length > 0) {
      setSelectedTicketId(tickets[0].id || '');
    }
  }, [sourceMode, selectedTicketId, tickets]);

  // Execution state mapping: scenarioId -> { status, timestamp, result, approvedBy, executionStep }
  
  const [executions, setExecutions] = useState({});

  useEffect(() => {
    const restored = {};

    // Audit history is the source of truth after navigation or a browser refresh.
    // Only restore runbook scenarios here; live-ticket runs use CUSTOM-* IDs.
    const knownScenarioIds = new Set(DEMO_SELF_HEAL_SCENARIOS.map((scenario) => scenario.id));

    auditLogs.forEach((log) => {
      const details = log.remediationDetails;
      const scenarioId = details && typeof details === 'object'
        ? details.scenarioId
        : null;

      const logText = `${log.automatedAction || ''} ${log.result || ''}`.toLowerCase();
      if (
        scenarioId &&
        knownScenarioIds.has(scenarioId) &&
        ['Success', 'Failed'].includes(log.executionStatus) &&
        log.automatedAction &&
        !restored[scenarioId]
      ) {
        restored[scenarioId] = {
          status: log.executionStatus === 'Success'
            ? 'Completed (Simulated)'
            : (logText.includes('escalat')
              ? 'Escalated to Human Tier 3'
              : 'Failed (Simulated)'),
          timestamp: log.timestamp || null,
          result: log.result || 'Execution record restored from audit history.',
        };
      }
    });

    if (Object.keys(restored).length > 0) {
      setExecutions((prev) => ({
        ...prev,
        ...restored,
      }));
    }
  }, [auditLogs]);

  // Modal Dialog States
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isKbModalOpen, setIsKbModalOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approverName, setApproverName] = useState('');
  const [approvalError, setApprovalError] = useState('');
  const [isSimulatingExecution, setIsSimulatingExecution] = useState(false);
  const [simulationProgressStep, setSimulationProgressStep] = useState(0);

  // Audit log filter state
  const [auditFilter, setAuditFilter] = useState('ALL');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  // 1. Resolve Active Issue Object
  const currentScenario = useMemo(() => {
    if (sourceMode === 'scenarios') {
      const scenario = DEMO_SELF_HEAL_SCENARIOS.find((s) => s.id === selectedScenarioId) || DEMO_SELF_HEAL_SCENARIOS[0];

      // VPN KB-1001 permits diagnostics and escalation only; it explicitly prohibits
      // production network-setting changes. Keep the UI aligned with that approved runbook.
      if (scenario.id === 'SCN-VPN-02') {
        return {
          ...scenario,
          hasMatchedRunbook: true,
          simulatedActionName: 'VPN Troubleshooting Assessment (No Configuration Changes)',
          targetSystem: 'VPN client diagnostics only',
          simulationSteps: [
            'Verify ordinary internet connectivity',
            'Confirm reconnect using the company-approved VPN profile',
            'Record the exact error message and VPN client version',
            'Escalate repeated authentication failures or multi-user impact',
          ],
          decisionReason: 'KB-1001 / SOP-NET-014 permits connectivity checks, use of the approved VPN profile, error and client-version capture, and escalation when required. It explicitly prohibits changing production network settings; no MTU rebind or daemon restart is included in this assessment simulation.',
        };
      }

      return { ...scenario, hasMatchedRunbook: true };
    }

    const ticket = tickets.find((t) => String(t.id) === String(selectedTicketId));
    if (!ticket) {
      return {
        ...DEMO_SELF_HEAL_SCENARIOS[0],
        id: 'NO-ACTIVE-TICKET',
        ticketId: 'N/A',
        scenarioName: 'Select an active incident',
        issue: 'Choose an incident to evaluate its approved remediation path.',
        hasMatchedRunbook: false,
        isEligibleForAutoRemediation: false,
        riskLevel: 'High',
        simulatedActionName: 'No action selected',
        targetSystem: 'Not evaluated',
        simulationSteps: [],
        decisionReason: 'No active incident is selected. Select a ticket before requesting remediation.',
      };
    }

    const ticketText = `${ticket.title || ''} ${ticket.description || ''}`.toLowerCase();
    // Match on the actual issue text, not broad categories alone (e.g. not every
    // Network incident is a VPN problem and not every Identity incident is a password reset).
    const isPass = /password|reset credentials|account lock(?:out)?/.test(ticketText);
    const isVpn = /\bvpn\b/.test(ticketText);
    const isOutlook = /outlook|mail sync|email sync/.test(ticketText);
    const isWifi = /wi[ -]?fi|wireless/.test(ticketText);
    const isSw = /software install|install software|software request|application installation/.test(ticketText);

    const matchedTemplate = DEMO_SELF_HEAL_SCENARIOS.find(
      (scenario) =>
        (isPass && scenario.id === 'SCN-PASS-01') ||
        (isVpn && scenario.id === 'SCN-VPN-02') ||
        (isOutlook && scenario.id === 'SCN-OUTLOOK-03') ||
        (isWifi && scenario.id === 'SCN-WIFI-04') ||
        (isSw && scenario.id === 'SCN-SW-05')
    );

    // Preserve the component's expected display shape, but never inherit an
    // unrelated runbook's action or eligibility for an unmatched live ticket.
    const displayTemplate = matchedTemplate || DEMO_SELF_HEAL_SCENARIOS[0];
    return {
      ...displayTemplate,
      id: `CUSTOM-${ticket.id}`,
      ticketId: ticket.id,
      scenarioName: ticket.title || 'Untitled incident',
      issue: ticket.description || 'No incident description was provided.',
      requester: ticket.requester || 'Employee',
      department: ticket.department || 'Engineering',
      category: ticket.category || 'Other',
      priority: ticket.priority || 'P3 - Medium',
      hasMatchedRunbook: Boolean(matchedTemplate),
      ...(isVpn && matchedTemplate ? {
        simulatedActionName: 'VPN Troubleshooting Assessment (No Configuration Changes)',
        targetSystem: 'VPN client diagnostics only',
        simulationSteps: [
          'Verify ordinary internet connectivity',
          'Confirm reconnect using the company-approved VPN profile',
          'Record the exact error message and VPN client version',
          'Escalate repeated authentication failures or multi-user impact',
        ],
        decisionReason: 'KB-1001 / SOP-NET-014 permits connectivity checks, use of the approved VPN profile, error and client-version capture, and escalation when required. It explicitly prohibits changing production network settings; no MTU rebind or daemon restart is included in this assessment simulation.',
      } : {}),
      ...(matchedTemplate ? {} : {
        isEligibleForAutoRemediation: false,
        riskLevel: 'High',
        simulatedActionName: 'No approved remediation mapped',
        targetSystem: 'Human review required',
        simulationSteps: [],
        decisionReason: 'No matching approved runbook was identified for this incident. Do not reuse an unrelated remediation; route it to human review.',
      }),
    };
  }, [sourceMode, selectedScenarioId, selectedTicketId, tickets]);

  // Block unrelated nearest-neighbour results for novel/proprietary issues with no verified runbook.
  const requiresHumanKnowledgeReview = useMemo(() => {
    const category = String(currentScenario.category || '').toLowerCase();
    const text = `${currentScenario.scenarioName || ''} ${currentScenario.issue || ''}`.toLowerCase();
    return category === 'general it' ||
      /no verified knowledge|novel or proprietary|legacy mainframe|unknown it question/.test(text) ||
      currentScenario.hasMatchedRunbook === false;
  }, [currentScenario]);

  // Knowledge matching is performed by the backend retrieval API, not a frontend keyword fallback.
  const [matchedKbArticle, setMatchedKbArticle] = useState({
    id: 'NO-KB', title: 'No approved knowledge source loaded', category: 'Unverified',
    sourceDocument: 'Not available', shortDescription: 'Run a backend knowledge search to retrieve an approved article.',
    troubleshootingInstructions: [], ragMetadata: { chunks: [] },
  });
  const [knowledgeLookupError, setKnowledgeLookupError] = useState('');

  useEffect(() => {
    let active = true;
    const query = `${currentScenario.issue || ''} ${currentScenario.scenarioName || ''}`.trim();

    if (requiresHumanKnowledgeReview) {
      setMatchedKbArticle({
        id: 'NO-KB', title: 'No verified knowledge article available', category: 'Unverified',
        sourceDocument: 'Not available',
        shortDescription: 'No verified matching runbook exists for this request. Human IT Support review is required.',
        troubleshootingInstructions: [], ragMetadata: { chunks: [] },
      });
      setKnowledgeLookupError('No verified knowledge article matches this request. Unrelated articles are intentionally blocked.');
      return () => { active = false; };
    }

    if (!query) {
      setMatchedKbArticle({ id: 'NO-KB', title: 'No approved knowledge source loaded', category: 'Unverified', sourceDocument: 'Not available', shortDescription: 'No issue description is available.', troubleshootingInstructions: [], ragMetadata: { chunks: [] } });
      return () => { active = false; };
    }
    api.searchKnowledge(query).then((response) => {
      if (!active) return;
      const items = Array.isArray(response) ? response : Array.isArray(response?.items) ? response.items : [];
      const article = items[0];
      if (!article) {
        setMatchedKbArticle({ id: 'NO-KB', title: 'No approved knowledge source matched', category: 'Unverified', sourceDocument: 'Not available', shortDescription: 'The backend found no relevant approved article. Human review is required.', troubleshootingInstructions: [], ragMetadata: { chunks: [] } });
        setKnowledgeLookupError('No relevant approved article was returned by the backend.');
        return;
      }
      setKnowledgeLookupError('');
      setMatchedKbArticle({
        ...article,
        id: article.article_id || article.id,
        sourceDocument: article.source_document || article.sourceDocument || 'Knowledge article',
        shortDescription: article.content || article.shortDescription || '',
        troubleshootingInstructions: article.troubleshooting_instructions || article.troubleshootingInstructions || [],
        ragMetadata: { chunks: [{ heading: 'Approved article content', text: article.content || '' }] },
      });
    }).catch((error) => {
      if (!active) return;
      setKnowledgeLookupError(error?.message || 'Knowledge API is unavailable.');
      setMatchedKbArticle({ id: 'NO-KB', title: 'Knowledge API unavailable', category: 'Unverified', sourceDocument: 'Not available', shortDescription: 'No local fallback is used because the backend source could not be verified.', troubleshootingInstructions: [], ragMetadata: { chunks: [] } });
    });
    return () => { active = false; };
  }, [currentScenario, requiresHumanKnowledgeReview]);

  // 3. Automation Dashboard Stats Calculation
  const dashboardStats = useMemo(() => {
    const totalCandidates = DEMO_SELF_HEAL_SCENARIOS.length;
    let successfulSimulations = 0;
    let failedSimulations = 0;
    let pendingApproval = DEMO_SELF_HEAL_SCENARIOS.filter((scenario) => {
      const execution = executions[scenario.id];
      const hasApprovalOrDecision = execution && [
        'Human Approved (Simulated)',
        'Success',
        'Completed (Simulated)',
        'Escalated to Human Tier 3',
        'Failed (Simulated)',
      ].includes(execution.status);
      return !scenario.isEligibleForAutoRemediation && !hasApprovalOrDecision;
    }).length;

    Object.values(executions).forEach((ex) => {
      if (
        ex.status === 'Completed (Simulated)' ||
        ex.status === 'Success'
      ) {
        successfulSimulations += 1;
      } else if (['Failed', 'Failed (Simulated)', 'Escalated to Human Tier 3'].includes(ex.status)) {
        failedSimulations += 1;
      } else if (ex.status === 'Pending Approval') {
        // Counted from scenario policy state above.
      }
    });

    return {
      totalCandidates,
      successfulSimulations,
      failedSimulations,
      pendingApproval,
    };
  }, [executions]);

  // Only offer simulation when the selected scenario has a mapped runbook and
  // the backend returned a knowledge source. The backend remains authoritative.
  const canSimulate = Boolean(
    !requiresHumanKnowledgeReview &&
    currentScenario.isEligibleForAutoRemediation &&
    currentScenario.hasMatchedRunbook !== false &&
    matchedKbArticle.id !== 'NO-KB' &&
    !knowledgeLookupError
  );

  // 4. Execution State for Active Scenario
  const activeExecution = executions[currentScenario.id] || {
    status: currentScenario.isEligibleForAutoRemediation ? 'Not Executed' : 'Pending Approval',
    timestamp: null,
    result: null,
  };

  const isAlreadyExecuted =
    activeExecution.status === 'Completed (Simulated)' ||
    activeExecution.status === 'Success';

  // 5. Execute Simulation Action
  
  const handleConfirmSimulation = async () => {
    if (!canSimulate) {
      setIsConfirmModalOpen(false);
      window.alert('Simulation is blocked because a matching runbook and approved knowledge source are not available. Escalate for human review.');
      return;
    }
    setIsConfirmModalOpen(false);
    setIsSimulatingExecution(true);
    setSimulationProgressStep(1);

    try {
      // Keep the first progress stage visible briefly.
      await new Promise((resolve) => setTimeout(resolve, 700));
      setSimulationProgressStep(2);

      const result = await api.simulateResolution({
        ticketId: currentScenario.ticketId || currentScenario.id,
        scenarioId: currentScenario.id,
        runbookId:
          currentScenario.matchedKnowledgeArticleId ||
          (matchedKbArticle.id !== 'NO-KB' ? matchedKbArticle.id : null),
        scenarioName: currentScenario.scenarioName,
        issue: currentScenario.issue,
        category: currentScenario.category,
        riskLevel: currentScenario.riskLevel,
        isEligibleForAutoRemediation: Boolean(
          currentScenario.isEligibleForAutoRemediation
        ),
        matchedKnowledgeArticleId:
          currentScenario.matchedKnowledgeArticleId ||
          (matchedKbArticle.id !== 'NO-KB' ? matchedKbArticle.id : null),
      });

      if (!result?.success) {
        throw new Error('Backend did not confirm the simulation.');
      }

      setSimulationProgressStep(3);

      setExecutions((prev) => ({
        ...prev,
        [currentScenario.id]: {
          status: result.status,
          timestamp:
            result.auditLog?.timestamp || new Date().toISOString(),
          result: result.result,
          sources: result.sources || [],
          confidence: result.confidence,
        },
      }));

      // Show the final result before closing the progress state.
      await new Promise((resolve) => setTimeout(resolve, 1200));
    } catch (error) {
      setExecutions((prev) => ({
        ...prev,
        [currentScenario.id]: {
          status: 'Failed',
          timestamp: new Date().toISOString(),
          result: error?.message || 'Simulation API failed.',
        },
      }));

      window.alert(error?.message || 'Simulation failed. Check the backend.');
    } finally {
      setIsSimulatingExecution(false);
      setSimulationProgressStep(0);
    }
  };

  // 6. Human Approval Handler
  const handleApproveScenario = async () => {
    if (!approverName.trim()) { setApprovalError('Enter the actual approver name before recording approval.'); return; }
    setApprovalError('');
    setIsApprovalModalOpen(false);
    try {
      const result = await api.approveResolution(currentScenario.ticketId || currentScenario.id, approverName.trim(), approvalNotes);
      if (!result?.success) throw new Error('Approval was not confirmed by the backend.');
      setExecutions((prev) => ({ ...prev, [currentScenario.id]: { status: result.status || 'Human Approved (Simulated)', timestamp: result.auditLog?.timestamp || new Date().toISOString(), result: result.message || 'Approval recorded for simulation only.' } }));
      setApprovalNotes('');
      setApproverName('');
    } catch (error) {
      window.alert(error?.message || 'Approval could not be saved.');
    }
  };

  const handleEscalateScenario = async () => {
    setIsApprovalModalOpen(false);
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const resultMsg = `Automated remediation rejected by policy. Escalated to Tier 3 SRE on-call team for manual review. Note: "${approvalNotes || 'Manual inspection required'}"`;

    setExecutions((prev) => ({
      ...prev,
      [currentScenario.id]: {
        status: 'Escalated to Human Tier 3',
        timestamp,
        result: resultMsg,
      },
    }));

    try {
      if (onAddAuditLog) {
        await onAddAuditLog({
          automatedAction: `Policy Rejection & Escalation: ${currentScenario.simulatedActionName}`,
          relatedItem: currentScenario.ticketId,
          executionStatus: 'Failed',
          timestamp: new Date().toISOString(),
          result: resultMsg,
          remediationDetails: {
            scenarioId: currentScenario.id,
            mode: 'MOCK',
            decision: 'Escalated to Human Tier 3',
          },
          isSimulated: true,
        });
      }
      if (onUpdateTicketStatus && currentScenario.ticketId && String(currentScenario.ticketId).startsWith('INC-')) {
        await onUpdateTicketStatus(currentScenario.ticketId, 'Escalated');
      }
    } catch (error) {
      window.alert(`Escalation was selected, but a persistence step failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setApprovalNotes('');
    }
  };

  // 7. Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (auditFilter === 'SUCCESS' && log.executionStatus !== 'Success') return false;
      if (auditFilter === 'FAILED' && log.executionStatus !== 'Failed') return false;
      if (auditFilter === 'PENDING' && !log.automatedAction?.toLowerCase().includes('approval') && !log.result?.toLowerCase().includes('pending')) {
        return false;
      }
      if (auditFilter === 'APPROVED' && !log.automatedAction?.toLowerCase().includes('approved') && !log.automatedAction?.toLowerCase().includes('sign-off')) {
        return false;
      }

      if (auditSearchQuery.trim()) {
        const query = auditSearchQuery.toLowerCase();
        const text = `${log.automatedAction} ${log.relatedItem} ${log.result} ${log.executionStatus}`.toLowerCase();
        if (!text.includes(query)) return false;
      }

      return true;
    });
  }, [auditLogs, auditFilter, auditSearchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & NOTICE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-600" />
              Auto-Resolution &amp; Self-Healing
            </h1>
            <span className="text-[10px] font-mono bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded border border-cyan-200 uppercase font-semibold">
              Automated Issue Resolution
            </span>
          </div>
          <p className="text-xs text-slate-500">
            The system matches issues with approved troubleshooting procedures and simulates eligible fixes with safety checks.
          </p>
        </div>

        {/* Status Pill Indicator */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Backend-driven simulation (MOCK only)
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-cyan-50 text-cyan-800 border border-cyan-200">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
            Zero-Trust Guardrails
          </span>
        </div>
      </div>

      {/* Safety Policy Disclaimer Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 leading-relaxed">
          <span className="font-bold text-amber-800">Technical Assessment Simulation Notice: </span>
          All remediation actions, network MTU re-binds, software entitlement grants, and account unlock procedures are executed strictly within an isolated frontend simulation environment.
          <strong className="block sm:inline sm:ml-1 text-slate-900 font-semibold">
            No real passwords, security permissions, production servers, or endpoint configurations will be modified.
          </strong>
        </div>
      </div>

      {/* 2. AUTOMATION DASHBOARD METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Candidates"
          value={dashboardStats.totalCandidates}
          change="AI Triage Scenarios"
          changeType="neutral"
          subtitle="Remediation pool"
          icon={Cpu}
        />
        <StatCard
          title="Successfully Simulated"
          value={dashboardStats.successfulSimulations}
          change="Safe Remediation"
          changeType="positive"
          subtitle="Non-destructive passes"
          icon={CheckCircle2}
          variant="dark"
        />
        <StatCard
          title="Failed / Escalated"
          value={dashboardStats.failedSimulations}
          change="Policy Intercepts"
          changeType={dashboardStats.failedSimulations > 0 ? 'negative' : 'positive'}
          subtitle="Blocked or escalated"
          icon={AlertTriangle}
        />
        <StatCard
          title="Requires Human Approval"
          value={dashboardStats.pendingApproval}
          change="CAB & Gate Checks"
          changeType="neutral"
          subtitle="High-risk controls"
          icon={Lock}
        />
      </div>

      {/* 3. ISSUE DETECTION & SCENARIO SELECTION */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-600" />
              Issue Detection &amp; Candidate Selection
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select an IT issue scenario to inspect its knowledge grounding, policy decision, and remediation simulation.
            </p>
          </div>

          {/* Toggle between Core Scenarios vs Active Incident Queue */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium self-start sm:self-auto border border-slate-200">
            <button
              type="button"
              onClick={() => setSourceMode('scenarios')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                sourceMode === 'scenarios'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Operational Runbook Scenarios ({DEMO_SELF_HEAL_SCENARIOS.length})
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('active-tickets')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                sourceMode === 'active-tickets'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live Queue Tickets ({tickets.length})
            </button>
          </div>
        </div>

        {/* MODE A: 6 Core Demo Scenarios Grid */}
        {sourceMode === 'scenarios' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {DEMO_SELF_HEAL_SCENARIOS.map((scn) => {
              const isSelected = selectedScenarioId === scn.id;
              const ex = executions[scn.id] || { status: 'Not Executed' };
              const isDone =
                ex.status === 'Completed (Simulated)' ||
                ex.status === 'Success' ||
                ex.status === 'Human Approved (Simulated)';

              return (
                <div
                  key={scn.id}
                  onClick={() => setSelectedScenarioId(scn.id)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between group card-elevate ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-50/70 ring-1 ring-cyan-500 shadow-xs text-slate-900'
                      : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 shadow-xs'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-cyan-700">{scn.ticketId}</span>
                      <RiskBadge risk={scn.riskLevel} />
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug group-hover:text-cyan-700 transition-colors">
                      {scn.scenarioName}
                    </h3>

                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {scn.issue}
                    </p>
                  </div>

                  <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-slate-500">{scn.category}</span>
                    {isDone ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Simulated
                      </span>
                    ) : scn.isEligibleForAutoRemediation ? (
                      <span className="text-cyan-700 font-medium">Eligible</span>
                    ) : (
                      <span className="text-amber-700 font-medium">Approval Req</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* MODE B: Active Tickets from ITSM Queue */
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter ticket ID, title, or category..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
              {tickets
                .filter(
                  (t) =>
                    !ticketSearch ||
                    t.id.toLowerCase().includes(ticketSearch.toLowerCase()) ||
                    t.title.toLowerCase().includes(ticketSearch.toLowerCase()) ||
                    t.category.toLowerCase().includes(ticketSearch.toLowerCase())
                )
                .map((t) => {
                  const isSelected = selectedTicketId === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTicketId(t.id)}
                      className={`p-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? 'bg-cyan-50 text-slate-900 font-medium' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono font-bold text-cyan-700 shrink-0">{t.id}</span>
                        <span className="truncate text-slate-900">{t.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <PriorityBadge priority={t.priority} />
                        <StatusBadge status={t.status} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* 4. MAIN WORKSPACE: DECISION ENGINE + KNOWLEDGE GROUNDING (TWO COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (7 Cols): AUTOMATION DECISION ENGINE & SIMULATION CONTROLS */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 font-mono">
                  Automation Decision Engine
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {currentScenario.scenarioName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ticket: <span className="font-mono font-semibold text-cyan-700">{currentScenario.ticketId}</span> • Requester: {currentScenario.requester} ({currentScenario.department})
                </p>
              </div>

              <div className="flex flex-col items-end gap-1">
                <RiskBadge risk={currentScenario.riskLevel} />
                <span className="text-[11px] font-mono text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                  Confidence: {typeof activeExecution.confidence === 'number' ? `${Math.round(activeExecution.confidence * 100)}% retrieval score` : 'Not evaluated'}
                </span>
              </div>
            </div>

            {/* Issue Summary Callout */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-mono">
                Detected Technical Anomaly:
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {currentScenario.issue}
              </p>
            </div>

            {/* Recommended Resolution */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                Recommended Next Steps (Approved Knowledge):
              </h4>
              {!requiresHumanKnowledgeReview && matchedKbArticle.id !== 'NO-KB' && matchedKbArticle.troubleshootingInstructions.length > 0 ? (
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-blue-900 bg-blue-50/80 p-3 rounded-xl border border-blue-200 leading-relaxed">
                  {matchedKbArticle.troubleshootingInstructions.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200 leading-relaxed">
                  No sufficiently relevant approved knowledge article was found. Automated remediation is not recommended; escalate for human review.
                </p>
              )}
              <p className="text-[10px] text-slate-500">
                The assessment records a simulation only. It does not apply changes to endpoints, accounts, or production systems.
              </p>
            </div>

            {/* Eligibility & Policy Reason Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl border bg-slate-50 border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-mono">
                  Action Status:
                </span>
                {canSimulate ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Recommended Action (Safe to Simulate)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    Waiting for Human Approval
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl border bg-slate-50 border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-mono">
                  Execution Mode:
                </span>
                <span className="text-xs font-medium text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-lg border border-cyan-200 inline-block font-mono">
                  Simulated Execution (Non-Destructive)
                </span>
              </div>
            </div>

            {/* Decision Reason */}
            <div className="p-3 rounded-xl border bg-slate-50 border-slate-200 space-y-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-mono">
                Policy &amp; Governance Justification:
              </span>
              <p className="text-slate-600 leading-relaxed">
                {currentScenario.decisionReason}
              </p>
            </div>

            {/* Safety Guardrails Checklist */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2 font-mono">
                Safety Guardrails &amp; Verification:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Least-privilege boundary verified</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Non-destructive operation scope</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Backend audit logging configured</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Rollback / timeout failsafe armed</span>
                </div>
              </div>
            </div>

            {/* EXECUTION ACTION BUTTONS & ACTIVE PROGRESS */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Current Execution:</span>
                <ExecutionBadge status={activeExecution.status} />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {canSimulate ? (
                  isAlreadyExecuted ? (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 flex items-center gap-1.5 shadow-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Simulation Completed (No Production Changes)
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsConfirmModalOpen(true)}
                        className="px-2.5 py-1.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-300 flex items-center gap-1 transition-colors"
                        title="Re-run simulated workflow for testing"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Re-simulate
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isSimulatingExecution || !canSimulate}
                      onClick={() => setIsConfirmModalOpen(true)}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Simulate Auto-Remediation</span>
                    </button>
                  )
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsApprovalModalOpen(true)}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Request Human Approval / CAB Review</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* LIVE SIMULATION PROGRESS BAR */}
            {isSimulatingExecution && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 text-slate-100 shadow-md">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400 animate-spin" />
                    Recording Simulation ({simulationProgressStep}/3)...
                  </span>
                  <span className="font-mono text-cyan-300 text-[11px]">
                    {currentScenario.simulatedActionName}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {currentScenario.simulationSteps?.map((stepText, idx) => {
                    const isPassed = idx < simulationProgressStep;
                    const isCurrent = idx === simulationProgressStep - 1;

                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-2 p-1.5 rounded-lg transition-colors ${
                          isCurrent
                            ? 'bg-slate-800 font-semibold text-cyan-200 border border-cyan-500/50'
                            : isPassed
                            ? 'text-emerald-400 font-medium'
                            : 'text-slate-500'
                        }`}
                      >
                        {isPassed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-current shrink-0 mt-0.5 flex items-center justify-center text-[9px]">
                            {idx + 1}
                          </div>
                        )}
                        <span className="leading-tight">{stepText}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Execution Result Banner */}
            {activeExecution.result && !isSimulatingExecution && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span className={`flex items-center gap-1.5 ${['Failed', 'Failed (Simulated)', 'Escalated to Human Tier 3'].includes(activeExecution.status) ? 'text-rose-700' : activeExecution.status === 'Completed (Simulated)' || activeExecution.status === 'Human Approved (Simulated)' || activeExecution.status === 'Success' ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {['Failed', 'Failed (Simulated)', 'Escalated to Human Tier 3'].includes(activeExecution.status)
                      ? <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    {activeExecution.status === 'Escalated to Human Tier 3' ? 'Escalation Recorded:' : ['Failed', 'Failed (Simulated)'].includes(activeExecution.status) ? 'Simulation Failed:' : activeExecution.status === 'Human Approved (Simulated)' ? 'Approval Recorded (Simulation Only):' : 'Simulation Result Recorded:'}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {activeExecution.timestamp}
                  </span>
                </div>
                <p className="text-slate-800 leading-relaxed font-mono text-[11px] bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                  {activeExecution.result}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (5 Cols): KNOWLEDGE-GROUNDED RESOLUTION ARTICLE */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 font-mono">
                  Knowledge-Grounded Resolution
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  Verified Runbook Retrieval
                </h3>
                <p className="text-xs text-slate-500">
                  Direct match from corporate IT Standard Operating Procedures (SOPs)
                </p>
              </div>

              <span className={`px-2 py-0.5 font-mono text-xs font-bold rounded-lg border ${
                matchedKbArticle.id === 'NO-KB' || requiresHumanKnowledgeReview
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {requiresHumanKnowledgeReview ? 'NO-KB' : matchedKbArticle.id}
              </span>
            </div>

            {/* Matched Article Header Card */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <CategoryBadge category={matchedKbArticle.category} />
                <span className="font-mono text-[10px] text-slate-500">
                  {matchedKbArticle.sourceDocument}
                </span>
              </div>

              <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                {matchedKbArticle.title}
              </h4>

              <div className="text-[11px] text-slate-600 leading-relaxed italic">
                {requiresHumanKnowledgeReview
                  ? 'No verified runbook is available for this request. Do not use unrelated troubleshooting instructions.'
                  : matchedKbArticle.shortDescription}
              </div>
              {(knowledgeLookupError || requiresHumanKnowledgeReview) && (
                <p role="alert" className="mt-2 text-xs text-amber-700 not-italic">
                  {requiresHumanKnowledgeReview
                    ? 'Human IT Support review is required. Automated remediation is blocked.'
                    : knowledgeLookupError}
                </p>
              )}
            </div>

            {/* Troubleshooting Steps List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-600" />
                  Grounded Troubleshooting Instructions:
                </h5>
                <span className="text-[10px] text-slate-500 font-mono">
                  {requiresHumanKnowledgeReview ? 0 : matchedKbArticle.troubleshootingInstructions.length} steps
                </span>
              </div>

              {requiresHumanKnowledgeReview ? (
                <p className="text-xs text-amber-900 bg-amber-50 p-3.5 rounded-xl border border-amber-200">
                  No verified knowledge article matches this issue. Do not apply steps from an unrelated article. Escalate to Human IT Support for review.
                </p>
              ) : (
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-700 bg-white p-3.5 rounded-xl border border-slate-200 max-h-56 overflow-y-auto">
                {matchedKbArticle.troubleshootingInstructions.map((step, idx) => (
                  <li key={idx} className="leading-relaxed pl-1">
                    <span className="text-slate-800">{step}</span>
                  </li>
                ))}
              </ol>
              )}
            </div>

            {/* Sources Used by AI Note */}
            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1 text-xs">
              <span className="font-bold text-blue-900 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Sources Used by AI:
              </span>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                {requiresHumanKnowledgeReview
                  ? 'No knowledge source was used because a verified article could not be matched. Automated remediation is blocked pending human review.'
                  : <>The system referenced section <code className="font-mono bg-white px-1 py-0.5 rounded border border-blue-200 font-bold text-blue-900">{matchedKbArticle.ragMetadata?.chunks?.[0]?.heading || 'Resolution Standard'}</code> from document <code className="font-mono bg-white px-1 py-0.5 rounded border border-blue-200 text-slate-700">{matchedKbArticle.sourceDocument}</code> to guide this simulated fix.</>}
              </p>
            </div>

            {/* Open Full Article Button */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsKbModalOpen(true)}
                className="text-xs text-cyan-700 hover:text-cyan-800 font-semibold flex items-center gap-1 transition-colors"
              >
                <span>Inspect Troubleshooting Guide</span>
                <ExternalLink className="w-3 h-3" />
              </button>

              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('knowledge-base')}
                  className="text-xs text-slate-500 hover:text-slate-900 font-medium flex items-center gap-1 transition-colors"
                >
                  <span>Go to Knowledge Base</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. AUTOMATION AUDIT LOG SECTION */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-600" />
              Automation Audit &amp; Compliance Log
            </h3>
            <p className="text-xs text-slate-500">
              Chronological backend audit history for simulated remediations, policy decisions, and approval records.
            </p>
          </div>

          {/* Audit Filters - horizontally scrollable */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto text-xs">
            {[
              { id: 'ALL', label: 'All Events' },
              { id: 'SUCCESS', label: 'Successful (Simulated)' },
              { id: 'FAILED', label: 'Failed / Escalated' },
              { id: 'PENDING', label: 'Pending Approval' },
              { id: 'APPROVED', label: 'Human Approved' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setAuditFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all shrink-0 ${
                  auditFilter === f.id
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search input for audit logs */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit trail by ticket ID, automated action, or execution result..."
              value={auditSearchQuery}
              onChange={(e) => setAuditSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <span className="text-xs font-mono text-cyan-700 font-bold shrink-0">
            {filteredAuditLogs.length} Entries
          </span>
        </div>

        {/* Mobile View for Audit Logs */}
        <div className="md:hidden space-y-3">
          {filteredAuditLogs.map((log) => (
            <div
              key={log.id}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-cyan-700">{log.relatedItem || 'N/A'}</span>
                <ExecutionBadge status={log.executionStatus} />
              </div>
              <p className="text-xs font-semibold text-slate-900">{log.automatedAction}</p>
              <p className="text-[11px] text-slate-600">{log.result}</p>
              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-mono">
                <span>{log.timestamp}</span>
                <span className="text-cyan-700">Simulated</span>
              </div>
            </div>
          ))}
          {filteredAuditLogs.length === 0 && (
            <p className="text-center text-slate-400 text-xs py-6">No matching audit events.</p>
          )}
        </div>

        {/* Desktop Audit Log Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10px]">
                <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                <th className="py-2.5 px-3 font-semibold">Ticket / Target</th>
                <th className="py-2.5 px-3 font-semibold">Automated Action</th>
                <th className="py-2.5 px-3 font-semibold">Execution Status</th>
                <th className="py-2.5 px-3 font-semibold">Remediation Result / Notes</th>
                <th className="py-2.5 px-3 font-semibold text-right">Audit Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredAuditLogs.length > 0 ? (
                filteredAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-700 whitespace-nowrap">
                      {log.relatedItem || log.relatedTicket || 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {log.automatedAction}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <ExecutionBadge status={log.executionStatus} />
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-md truncate">
                      {log.result}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-50 text-cyan-800 border border-cyan-200">
                        Simulated
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No automation audit events matched your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CONFIRMATION DIALOG BEFORE EXECUTION */}
      {isConfirmModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsConfirmModalOpen(false)}
          title="Confirm Simulated Remediation Execution"
          maxWidth="max-w-xl"
          footer={
            <>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSimulation}
                className="px-4 py-1.5 text-xs bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Confirm &amp; Execute Simulation</span>
              </button>
            </>
          }
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="bg-cyan-50 p-3.5 rounded-xl border border-cyan-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800 font-mono">
                Action Payload to Simulate:
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {currentScenario.simulatedActionName}
              </p>
              <p className="text-[11px] text-slate-600">
                Target System: <span className="font-mono text-cyan-700 font-semibold">{currentScenario.targetSystem}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Related Ticket:</span>
                <span className="font-mono font-bold text-cyan-700">{currentScenario.ticketId}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Risk Rating:</span>
                <span className="font-bold text-slate-900">{currentScenario.riskLevel}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="font-bold text-slate-900 block">Proposed Execution Steps:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {currentScenario.simulationSteps?.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong className="text-amber-800">Simulation Boundary Notice:</strong> This action will be executed within the safe technical assessment simulation. It records a backend simulation result and audit event only. It does not apply changes to endpoints, accounts, network settings, or production systems.
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: HUMAN APPROVAL / CAB REVIEW WORKFLOW */}
      {isApprovalModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsApprovalModalOpen(false)}
          title="Human Approval & Change Advisory Board (CAB) Review"
          maxWidth="max-w-xl"
          footer={
            <>
              <button
                type="button"
                onClick={() => setIsApprovalModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleEscalateScenario}
                className="px-3.5 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold flex items-center gap-1 transition-colors"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Reject &amp; Escalate to Tier 3</span>
              </button>
              <button
                type="button"
                onClick={handleApproveScenario}
                className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-xs transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Authorize &amp; Approve Simulation</span>
              </button>
            </>
          }
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>High-Risk Policy Intercepted</span>
              </div>
              <p className="text-[11px] text-rose-900 leading-relaxed">
                Automated fix was paused because the requested action involves a production resource (<span className="font-mono text-cyan-800 font-semibold">{currentScenario.category}</span>). Security policy mandates human approval when needed.
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-900 block mb-1">Issue Details:</span>
              <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
                {currentScenario.issue}
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Authorized Approver Persona:
              </label>
              <input type="text" value={approverName} onChange={(e) => setApproverName(e.target.value)} placeholder="Enter actual approver name" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-cyan-500" />
              {approvalError && <p role="alert" className="mt-1 text-rose-700">{approvalError}</p>}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Approval Notes / Justification:
              </label>
              <textarea
                rows={3}
                placeholder="Enter review notes, change advisory reference, or escalation reason..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: FULL RUNBOOK INSPECTOR MODAL */}
      {isKbModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsKbModalOpen(false)}
          title={`Runbook: ${matchedKbArticle.title} (${matchedKbArticle.id})`}
          maxWidth="max-w-2xl"
          footer={
            <button
              type="button"
              onClick={() => setIsKbModalOpen(false)}
              className="px-4 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold transition-colors"
            >
              Close Runbook
            </button>
          }
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <CategoryBadge category={matchedKbArticle.category} />
              <span className="font-mono text-cyan-700 font-semibold text-[11px]">
                Source: {matchedKbArticle.sourceDocument}
              </span>
            </div>

            <p className="italic text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {matchedKbArticle.shortDescription}
            </p>

            <div>
              <h5 className="font-bold text-slate-900 mb-2">Troubleshooting Instructions:</h5>
              <ol className="list-decimal list-inside space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                {matchedKbArticle.troubleshootingInstructions.map((s, i) => (
                  <li key={i} className="leading-relaxed">
                    <span className="font-medium text-slate-800">{s}</span>
                  </li>
                ))}
              </ol>
            </div>

            {matchedKbArticle.ragMetadata?.chunks && (
              <div>
                <h5 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                  RAG Document Chunks:
                </h5>
                <div className="space-y-2">
                  {matchedKbArticle.ragMetadata.chunks.map((c, i) => (
                    <div key={i} className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-[11px]">
                      <span className="font-mono font-bold text-blue-900 block mb-0.5">
                        {c.chunkId} — {c.heading}
                      </span>
                      <p className="text-slate-700">{c.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
