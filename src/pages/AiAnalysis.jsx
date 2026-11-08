import React, { useState, useEffect, useRef } from 'react';
import {
  BrainCircuit,
  Sparkles,
  Layers,
  Activity,
  CheckCircle,
  AlertOctagon,
  ArrowRight,
  TrendingUp,
  Cpu,
  FileCheck,
  Zap,
  Info,
  RefreshCw,
  BarChart3,
  Search,
  Sliders,
  AlertTriangle,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Check,
  XCircle,
  Clock,
  ExternalLink,
  Laptop,
  Database,
  BookOpen
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard.jsx';
import { PriorityBadge, StatusBadge, CategoryBadge, OriginBadge } from '../components/common/Badge.jsx';
import { AI_INCIDENT_CLUSTERS, TRIAGE_SIMULATION_PRESETS } from '../data/mockData.js';
import { api } from '../services/api.js';

// Keep confidence display consistent with AutoResolution.jsx.
// Backend values in [0, 1] are fractions; values above 1 are percentages.
// This is retrieval similarity, not a calibrated probability.
function getConfidencePercent(...values) {
  for (const value of values) {
    const candidate = typeof value === 'object' && value !== null
      ? (value.score ?? value.value ?? value.confidence)
      : value;

    if (typeof candidate !== 'number' || !Number.isFinite(candidate)) continue;
    if (candidate < 0) continue;

    const percent = candidate <= 1 ? candidate * 100 : candidate;
    if (percent <= 100) return Math.round(percent);
  }
  return null;
}

// Use retrieval-specific fields only. Classification confidence is not
// knowledge retrieval similarity and must not be used as a fallback.
function getRetrievalSimilarity(triage) {
  const primaryKnowledgeMatch = triage?.sources?.[0] || null;

  return getConfidencePercent(
    triage?.retrievalSimilarity,
    triage?.retrieval_similarity,
    primaryKnowledgeMatch?.retrieval_score,
    primaryKnowledgeMatch?.retrievalScore,
    primaryKnowledgeMatch?.similarityScore,
    primaryKnowledgeMatch?.similarity_score,
    primaryKnowledgeMatch?.similarity,
    primaryKnowledgeMatch?.score
  );
}

export function AiAnalysis({
  tickets = [],
  softwareRequests = [],
  auditLogs = [],
  onOpenTicketModal,
  onUpdateTicketStatus,
  onNavigateToAutoResolution
}) {
  // Navigation tabs: 'inspector', 'sandbox', 'clusters'
  const [activeTab, setActiveTab] = useState('inspector');

  // Search & Filter state for the Request Inspector
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'INCIDENT' | 'SOFTWARE' | 'ESCALATED'

  // Fixed retrieval similarity threshold. Change only in code if needed.
  const confidenceThreshold = 40;

  // Combine incidents and software requests into unified inspectable records
  const allRecords = [
    ...tickets.map((t) => ({
      ...t,
      recordType: 'Incident',
      recordId: t.id || t.incident_id || t.incidentId || t._id,
      promptText: t.description || t.title,
      intent: t.aiTriage?.intent || 'Not analyzed',
      subcategory: t.aiTriage?.subcategory || 'Not returned by backend',
      impact: t.aiTriage?.impact || 'Not assessed by backend',
      urgency: t.aiTriage?.urgency || 'Not assessed by backend',
      confidenceScore: null,
    })),
    ...softwareRequests.map((r) => ({
      ...r,
      recordType: 'Service Request',
      recordId: r.id || r.request_id || r.requestId || r._id,
      title: `Software Request: ${r.requestedSoftware}`,
      description: r.provisioningLog || `Requested corporate entitlement for ${r.requestedSoftware}.`,
      promptText: r.requestDescription || r.description || `Software request: ${r.requestedSoftware || 'Not specified'}`,
      intent: 'Service Request',
      category: r.category || 'Not categorized',
      subcategory: r.subcategory || 'Not returned by backend',
      priority: r.priority || 'Not assessed',
      impact: 'Not assessed by backend',
      urgency: 'Not assessed by backend',
      assignmentGroup: r.assignedGroup || 'Not assigned',
      assignee: r.assignee || 'Not assigned',
      confidenceScore: null,
      status: r.status === 'Completed' ? 'Resolved' : r.status,
      aiTriage: r.aiTriage || null,
    })),
  ];

  // Active selected record state
  const [selectedRecordId, setSelectedRecordId] = useState(
    allRecords[0]?.recordId || 'INC001001'
  );

  // Find currently selected record
  const selectedRecord =
    allRecords.find((r) => r.recordId === selectedRecordId) || allRecords[0] || null;

// Filtered records for the selector list
  const filteredRecords = allRecords.filter((rec) => {
    if (filterType === 'INCIDENT' && rec.recordType !== 'Incident') return false;
    if (filterType === 'SOFTWARE' && rec.recordType !== 'Service Request') return false;
    if (filterType === 'ESCALATED' && rec.status !== 'Escalated') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = rec.recordId?.toLowerCase().includes(q);
      const matchTitle = rec.title?.toLowerCase().includes(q);
      const matchDesc = rec.description?.toLowerCase().includes(q);
      const matchReq = rec.requester?.toLowerCase().includes(q);
      if (!matchId && !matchTitle && !matchDesc && !matchReq) return false;
    }
    return true;
  });

  // METRICS COMPUTATION
  const totalInQueue = allRecords.length;
  const incidentsDetected = allRecords.filter((r) => r.recordType === 'Incident').length;
  const serviceRequestsDetected = allRecords.filter((r) => r.recordType === 'Service Request').length;
  // Count only records explicitly marked eligible by backend data; a software request is not
  // automatically safe or eligible for automated remediation.
  const automatableDetected = allRecords.filter(
    (r) => r.isEligibleForAutoRemediation === true ||
      r.is_eligible_for_auto_remediation === true ||
      r.aiTriage?.isEligibleForAutoRemediation === true
  ).length;
  const requestsEscalated = allRecords.filter((r) => r.status === 'Escalated').length;

  // SELECTED RECORD DIAGNOSTICS
  const [associatedArticles, setAssociatedArticles] = useState([]);
  const [triageByRecord, setTriageByRecord] = useState({});
  const [triageStatusByRecord, setTriageStatusByRecord] = useState({});
  const triageRequestedRef = useRef(new Set());
  const [triageLoading, setTriageLoading] = useState(false);
  const [inspectorTriageError, setInspectorTriageError] = useState('');
  const [knowledgeSourceError, setKnowledgeSourceError] = useState('');
  const [clarificationAnswer, setClarificationAnswer] = useState('');
  const selectedTriage = selectedRecord
    ? triageByRecord[selectedRecord.recordId] || null
    : null;

  // Keep AI classification fields consistent and flag obvious taxonomy mismatches.
  const triageCategory =
    selectedTriage?.predictedCategory ||
    selectedTriage?.category ||
    selectedRecord?.category ||
    'Not analyzed';
  const triageSubcategory =
    selectedTriage?.subcategory ||
    selectedTriage?.subCategory ||
    selectedTriage?.sub_category ||
    '';
  const knownQueueCategories = new Set(
    allRecords.map((record) => String(record.category || '').trim().toLowerCase()).filter(Boolean)
  );
  const categoryMismatch =
    Boolean(triageSubcategory) &&
    triageSubcategory.trim().toLowerCase() !== String(triageCategory).trim().toLowerCase() &&
    knownQueueCategories.has(triageSubcategory.trim().toLowerCase());
  const aiSuggestedPriority =
    selectedTriage?.suggestedPriority ||
    selectedTriage?.suggested_priority ||
    selectedTriage?.priorityRecommendation ||
    selectedTriage?.priority_recommendation ||
    '';
  const displayedPriority = aiSuggestedPriority || selectedRecord?.priority;
  // Persistent queue state survives the parent's periodic backend refresh.
  const triageQueueRef = useRef([]);
  const triageProcessingRef = useRef(false);

  // Process up to 3 requests concurrently. A small worker pool speeds up the
  // queue without flooding FastAPI/MongoDB with too many simultaneous calls.
  const processTriageQueue = async () => {
    if (triageProcessingRef.current) return;
    triageProcessingRef.current = true;

    const worker = async () => {
      while (triageQueueRef.current.length > 0) {
        const record = triageQueueRef.current.shift();
        if (!record) continue;

        const issueText = String(
          record.promptText || record.description || record.title || ''
        ).trim();
        const requestKey = `${record.recordId}:${issueText}`;

        try {
          setTriageStatusByRecord((previous) => ({
            ...previous,
            [record.recordId]: 'Analyzing',
          }));

          const result = await api.runTriage(
            issueText,
            record.department || 'General'
          );

          if (!result?.success) {
            throw new Error('Backend did not confirm triage.');
          }

          setTriageByRecord((previous) => ({
            ...previous,
            [record.recordId]: result,
          }));
          setTriageStatusByRecord((previous) => ({
            ...previous,
            [record.recordId]: result.needsClarification
              ? 'Analyzed — clarification optional'
              : 'Analyzed',
          }));
        } catch (error) {
          setTriageStatusByRecord((previous) => ({
            ...previous,
            [record.recordId]: 'Analysis failed — retry pending',
          }));
          console.error(`[AI Analysis] Triage failed for ${record.recordId}:`, error);
          // Let a later backend refresh retry this request if it failed.
          triageRequestedRef.current.delete(requestKey);

          if (record.recordId === selectedRecord?.recordId) {
            setInspectorTriageError(
              error?.message || 'Backend triage is unavailable.'
            );
          }
        }
      }
    };

    try {
      await Promise.all(Array.from({ length: 3 }, () => worker()));
    } finally {
      triageProcessingRef.current = false;
      setTriageLoading(triageQueueRef.current.length > 0);
      // Pick up any records added while the workers were running.
      if (triageQueueRef.current.length > 0) {
        processTriageQueue();
      }
    }
  };

  // Analyze all current records and dynamically enqueue newly arrived records.
  // Existing records are deduplicated by record ID + issue text.
  useEffect(() => {
    const recordsToQueue = allRecords.filter((record) => {
      const issueText = String(
        record.promptText || record.description || record.title || ''
      ).trim();
      const requestKey = `${record.recordId}:${issueText}`;

      if (!record.recordId || issueText.length < 3 ||
          triageRequestedRef.current.has(requestKey)) {
        return false;
      }

      triageRequestedRef.current.add(requestKey);
      return true;
    });

    if (recordsToQueue.length > 0) {
      triageQueueRef.current.push(...recordsToQueue);
      setTriageLoading(true);
      processTriageQueue();
    }
  }, [tickets, softwareRequests]);

  const handleSubmitClarification = async () => {
    if (!selectedRecord || !selectedTriage?.needsClarification || !clarificationAnswer) {
      return;
    }

    const originalIssue = String(
      selectedTriage.original_issue ||
      selectedRecord.description ||
      selectedRecord.title ||
      ''
    ).trim();
    const clarificationKey = selectedTriage.clarification_key;

    if (!originalIssue || !clarificationKey) {
      setInspectorTriageError('The backend clarification response is missing required details.');
      return;
    }

    setTriageLoading(true);
    setInspectorTriageError('');

    try {
      const result = await api.runTriage(originalIssue, selectedRecord.department || 'General', {
        original_issue: originalIssue,
        clarification_answers: {
          [clarificationKey]: clarificationAnswer,
        },
      });

      if (!result?.success) {
        throw new Error('Backend did not confirm triage after clarification.');
      }

      setTriageByRecord((previous) => ({
        ...previous,
        [selectedRecord.recordId]: result,
      }));
      setClarificationAnswer('');
    } catch (error) {
      setInspectorTriageError(
        error?.message || 'Could not submit the clarification. Please try again.'
      );
    } finally {
      setTriageLoading(false);
    }
  };

  // Display only the sources returned with this record's backend triage response.
  // A separate broad search can return unrelated articles and must not be presented as
  // evidence used by the triage decision.
  useEffect(() => {
    const sources = Array.isArray(selectedTriage?.sources) ? selectedTriage.sources : [];
    setAssociatedArticles(sources);
    setKnowledgeSourceError(
      sources.length ? '' :
        selectedTriage?.needsClarification
          ? 'Answer the clarification question to complete triage and retrieve relevant knowledge sources.'
          : selectedTriage ? 'No approved knowledge source matched this triage result.' :
        'Run backend triage to retrieve knowledge sources for this incident.'
    );
  }, [selectedRecord?.recordId, selectedTriage]);

  // An audit entry alone is not proof of execution. Require explicit backend confirmation.
  const recordedExecution = selectedRecord
    ? auditLogs.find((log) => log.relatedItem === selectedRecord.recordId) || null
    : null;
  const executionStatus = (() => {
    if (!recordedExecution) return 'Action status unverified';
    const statusText = String(
      recordedExecution.status || recordedExecution.actionStatus || recordedExecution.type || ''
    ).toLowerCase();
    const detailsText = String(
      recordedExecution.result || recordedExecution.message || recordedExecution.automatedAction || ''
    ).toLowerCase();
    if (recordedExecution.isSimulated === true || statusText.includes('simulation') || statusText.includes('simulated') || detailsText.includes('simulation') || detailsText.includes('simulated') || detailsText.includes('mock-only')) {
      return 'Simulated';
    }
    if (recordedExecution.executionConfirmed === true) {
      return 'Execution confirmed by backend';
    }
    return 'Action status unverified';
  })();

  // Use retrieval-specific fields only, never classification confidence.
  // The incident list and detail panel call the same helper.
  const retrievalSimilarity = getRetrievalSimilarity(selectedTriage);
  const isAboveReferenceThreshold = retrievalSimilarity !== null
    && retrievalSimilarity >= confidenceThreshold;
  const hasKnowledgeSource = associatedArticles.length > 0;

  const incidentPriority = String(
    selectedRecord?.priority || selectedRecord?.suggestedPriority ||
    selectedRecord?.aiTriage?.suggestedPriority || selectedTriage?.suggestedPriority ||
    selectedTriage?.suggested_priority || selectedTriage?.priority || ''
  ).toLowerCase();
  const incidentRisk = String(
    selectedRecord?.riskLevel || selectedRecord?.risk_level ||
    selectedTriage?.riskLevel || selectedTriage?.risk_level || ''
  ).toLowerCase();
  const isCriticalIncident = /(^|\b)(p1|critical)(\b|$)/.test(incidentPriority)
    || incidentRisk.includes('critical');

  // Human review is selected by retrieval threshold, missing approved KB, or
  // an explicit backend escalation. Criticality remains a separate execution
  // safety constraint, but does not override the displayed similarity decision.
  const requiresHumanReview =
    !selectedTriage ||
    Boolean(selectedTriage?.escalated) ||
    selectedRecord?.status === 'Escalated' ||
    isCriticalIncident ||
    !hasKnowledgeSource ||
    retrievalSimilarity === null ||
    !isAboveReferenceThreshold;

  const automationDecision = requiresHumanReview
    ? 'Escalated for Human Review'
    : 'Self-Heal Candidate — Runbook Verification Required';

  const automationDecisionReason = !selectedTriage
    ? 'Backend triage has not returned a result.'
    : (selectedRecord?.status === 'Escalated' || selectedTriage?.escalated)
      ? (selectedTriage?.escalationReason || selectedTriage?.escalation_reason
        || 'Backend triage explicitly flagged this request for human review.')
      : !hasKnowledgeSource
        ? 'No approved knowledge source was returned by backend retrieval.'
        : retrievalSimilarity === null
          ? 'Retrieval similarity was not returned by the backend.'
          : !isAboveReferenceThreshold
            ? `Retrieval similarity (${retrievalSimilarity.toFixed(1)}%) is below the ${confidenceThreshold}% threshold, so human review is selected.`
            : `Retrieval similarity (${retrievalSimilarity.toFixed(1)}%) is at or above the ${confidenceThreshold}% threshold and an approved knowledge source was found. The incident qualifies as a self-heal candidate.`;

  const incidentText = String(
    selectedRecord?.description || selectedRecord?.title || selectedRecord?.promptText ||
    selectedTriage?.issue || selectedTriage?.summary || selectedTriage?.answer || ''
  ).toLowerCase();

  // Prefer an incident-specific cause derived from the selected ticket.
  // Some backend/mock responses may return the same generic possibleCause for
  // every incident, so use that field only when the incident doesn't match a
  // known category.
  const incidentSpecificCause =
    incidentText.includes('outlook') || incidentText.includes('email') || incidentText.includes('webmail')
      ? 'The email service may be unavailable, Outlook may not be syncing, or there may be a connectivity issue. Check service health and whether other employees are affected.'
      : incidentText.includes('vpn')
        ? 'The VPN client, network connection, authentication, or VPN gateway may be causing the issue. Check the connection and exact error message.'
        : incidentText.includes('password') || incidentText.includes('login') || incidentText.includes('sign in') || incidentText.includes('mfa') || incidentText.includes('authentication')
          ? 'The password may have expired, the account may be locked, or authentication/MFA may be failing. Verify the account status and follow identity-verification steps.'
          : incidentText.includes('database') || incidentText.includes('postgres') || incidentText.includes('sql') || incidentText.includes('connection pool')
            ? 'The database service may be unavailable, connections may be exhausted, or the application may be unable to reach the database. Check database health, connection metrics, and logs.'
            : incidentText.includes('software') || incidentText.includes('install') || incidentText.includes('application') || incidentText.includes('vs code')
              ? 'The software may need approval, the installation may have failed, or the application may be misconfigured. Check the request status and approved deployment process.'
              : incidentText.includes('printer')
                ? 'The printer may be offline, disconnected, or experiencing a queue or driver issue. Check its connection, status, and print queue.'
                : null;

  const possibleCause =
    incidentSpecificCause ||
    selectedTriage?.possibleCause || selectedTriage?.possible_cause ||
    selectedTriage?.rootCause || selectedTriage?.root_cause ||
    selectedTriage?.diagnosis || selectedTriage?.cause ||
    selectedRecord?.aiTriage?.possibleCause || selectedRecord?.aiTriage?.rootCause ||
    'The cause has not been identified yet. Review the incident details, logs, and approved troubleshooting steps before taking action.';


  const decisionExplanation = requiresHumanReview
    ? `Human review selected because ${automationDecisionReason}`
    : `Self-heal candidate selected because retrieval similarity (${retrievalSimilarity?.toFixed(1)}%) meets the ${confidenceThreshold}% threshold and an approved knowledge source was found. ${isCriticalIncident ? 'This incident is marked critical, so actual remediation still requires the configured safety approval; the similarity decision itself is not overridden.' : 'Verify the runbook and action safety before execution.'}`;

  // Display only a reference returned by the persisted record/backend.
  // Do not invent a ServiceNow number when the mock adapter has not synced it.
  const mockServiceNowKey =
    selectedRecord?.mockServiceNowId ||
    selectedRecord?.serviceNowNumber ||
    selectedRecord?.servicenow_number ||
    selectedRecord?.serviceNowId ||
    selectedRecord?.servicenow_id ||
    selectedRecord?.snowNumber ||
    selectedTriage?.serviceNowReference ||
    selectedTriage?.servicenow_reference ||
    'Not synced';

  // SANDBOX SIMULATION STATE (Tab 2)
  const [inputText, setInputText] = useState(TRIAGE_SIMULATION_PRESETS[0].text);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState({
    predictedCategory: 'Not run', confidence: '—', suggestedPriority: 'Needs Assessment',
    priorityReasoning: 'Run an analysis to retrieve evidence from the backend knowledge base.',
    sentiment: 'Not evaluated', sentimentScore: 'Not evaluated', recommendedGroup: 'Pending analysis',
    matchedRunbook: 'No analysis run yet', deflectionFeasibility: 'Pending analysis',
    safetyAssessment: 'No remediation or production change has been performed.',
  });
  const [triageError, setTriageError] = useState('');

  const [clusterActionNotice, setClusterActionNotice] = useState(null);

  const handleRunSimulation = async (textToAnalyze = inputText) => {
    const query = String(textToAnalyze || '').trim();
    if (query.length < 3) {
      setTriageError('Please enter a little more detail before running triage.');
      return;
    }
    setIsSimulating(true);
    setTriageError('');
    try {
      const result = await api.runTriage(query);
      if (!result?.success) throw new Error('Backend did not confirm triage.');
      setSimulationResult({
        predictedCategory: result.predictedCategory || result.category || 'Unknown / Unclassified',
        confidence: (() => {
          const confidencePercent = getConfidencePercent(
            result.confidence,
            result.confidence_pct,
            result.confidencePercent,
            result.confidence_score,
            result.confidenceScore,
            result.retrieval_score,
            result.retrievalScore,
            result.similarity_score,
            result.similarityScore,
            result.score,
            result.sources?.[0]?.confidence,
            result.sources?.[0]?.score
          );
          return confidencePercent !== null
            ? `${confidencePercent}% retrieval similarity`
            : 'Not returned';
        })(),
        suggestedPriority: result.suggestedPriority || result.suggested_priority || result.priorityRecommendation || result.priority_recommendation || 'Needs Assessment',
        priorityReasoning: result.priorityReasoning || 'No priority reasoning was returned.',
        sentiment: result.sentiment || 'Not evaluated',
        sentimentScore: result.sentimentScore || 'Not evaluated',
        recommendedGroup: result.recommendedGroup || 'Not returned by backend',
        matchedRunbook: result.matchedRunbook || 'No approved runbook matched',
        deflectionFeasibility: result.deflectionFeasibility || 'Human review required',
        safetyAssessment: result.safetyAssessment || 'No supported action was returned.',
        answer: result.answer,
        sources: result.sources || [],
        escalated: Boolean(result.escalated),
        retrievalMode: result.retrievalMode,
      });
    } catch (error) {
      setTriageError(error?.message || 'Triage API is unavailable. Check that the backend is running.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSimulateClusterAction = (clusterId, actionName) => {
    setClusterActionNotice({
      clusterId,
      message: `Demo-only remediation simulation: "${actionName}" for cluster ${clusterId}. This is a local demo only; no backend action or production change was executed.`,
    });
    setTimeout(() => setClusterActionNotice(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Module Title & AI Analysis Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              AI Analysis &amp; Incident Triage
            </h2>
            <span className="text-[10px] font-mono bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded border border-cyan-200 uppercase font-semibold">
              AI-Based Issue Analysis
            </span>
          </div>
          <p className="text-xs text-slate-500">
            AI analyses reported problems, identifies issue categories, estimates urgency and recommends the next steps.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Classification Model:</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-800 font-mono text-[11px] font-medium border border-cyan-200">
            <Zap className="w-3.5 h-3.5 text-cyan-600" />
            Triage Model (Simulation Engine)
          </span>
        </div>
      </div>

      {/* 1. OVERVIEW SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Requests in Queue"
          value={totalInQueue}
          change="Live Queue"
          changeType="neutral"
          subtitle="Incidents & service requests"
          icon={Layers}
        />
        <StatCard
          title="Incidents Detected"
          value={incidentsDetected}
          change={`${tickets.filter((t) => t.isUserCreated).length} User Logged`}
          changeType="positive"
          subtitle="Break-fix & outages"
          icon={AlertTriangle}
        />
        <StatCard
          title="Service Requests"
          value={serviceRequestsDetected}
          change={`${softwareRequests.length} Entitlements`}
          changeType="neutral"
          subtitle="Software & access"
          icon={Laptop}
        />
        <StatCard
          title="Automatable Issues"
          value={automatableDetected}
          change="Eligible for Automated Fix"
          changeType="positive"
          subtitle="Identity, password, software"
          icon={Cpu}
          variant="dark"
        />
        <StatCard
          title="Requests Escalated"
          value={requestsEscalated}
          change={requestsEscalated > 0 ? `${requestsEscalated} escalated` : '0 escalated'}
          changeType={requestsEscalated > 0 ? 'negative' : 'positive'}
          subtitle="Tier 3 specialist review"
          icon={AlertOctagon}
        />
      </div>

      {/* ============================================================ */}
      {/* TAB 1: REQUEST DECISION INSPECTOR */}
      {/* ============================================================ */}
      {activeTab === 'inspector' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Select Request to Inspect Card (4 Cols) */}
          <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[780px] xl:h-[840px]">
            {/* List Toolbar Header */}
            <div className="p-3.5 border-b border-slate-200 bg-slate-50/80 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Select Request to Inspect
                </span>
                <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                  {filteredRecords.length} Items
                </span>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by ID, summary, requester..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
                {['ALL', 'INCIDENT', 'SOFTWARE', 'ESCALATED'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilterType(f)}
                    className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-lg transition-colors whitespace-nowrap ${
                      filterType === f
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {f === 'ALL' ? 'All' : f === 'INCIDENT' ? 'Incidents' : f === 'SOFTWARE' ? 'Software' : 'Escalated'}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Records List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-sidebar-scroll">
              {filteredRecords.map((record) => {
                const isSelected = record.recordId === selectedRecord?.recordId;

                return (
                  <button
                    key={`${record.recordType}-${record.recordId}`}
                    type="button"
                    onClick={() => setSelectedRecordId(record.recordId)}
                    className={`w-full text-left p-3.5 transition-colors flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-blue-50/80 border-l-4 border-l-blue-600 shadow-xs'
                        : 'hover:bg-slate-50/90 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-blue-700">
                          {record.recordId}
                        </span>
                        <OriginBadge isUserCreated={record.isUserCreated} />
                      </div>
                      <StatusBadge status={record.status} />
                    </div>

                    <p className="text-xs font-semibold text-slate-900 truncate leading-snug">
                      {record.title}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span className="font-medium text-slate-700">{record.category}</span>
                      <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-semibold">
                        Similarity: {(() => {
                          const recordTriage = triageByRecord[record.recordId] || record.aiTriage || {};
                          const percent = getRetrievalSimilarity(recordTriage);
                          return percent !== null
                            ? `${percent}%`
                            : triageStatusByRecord[record.recordId] || 'Queued for analysis';
                        })()}
                      </span>
                    </div>
                  </button>
                );
              })}

              {filteredRecords.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400">
                  No records match your search criteria.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: AI Decision & Resolution Analysis Card (8 Cols - Exactly Same Height) */}
          <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[780px] xl:h-[840px]">
            {selectedRecord ? (
              <>
                {/* Fixed Top Header of the Analysis Card */}
                <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 shrink-0 flex flex-col gap-3 min-w-0">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs uppercase tracking-wider">
                        <BrainCircuit className="w-4 h-4 text-blue-600" />
                        <span>AI Decision &amp; Resolution Analysis</span>
                      </div>
                      <span className="text-slate-300">|</span>
                      <span className="font-mono text-xs font-bold text-blue-700">
                        {selectedRecord.recordId}
                      </span>
                      <OriginBadge isUserCreated={selectedRecord.isUserCreated} />
                      <StatusBadge status={selectedRecord.status} />
                      <PriorityBadge priority={displayedPriority} />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 whitespace-normal break-words leading-snug">
                      {selectedRecord.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-start sm:justify-end gap-2 flex-wrap w-full min-w-0">
                    {onNavigateToAutoResolution && (
                      <button
                        type="button"
                        disabled={requiresHumanReview}
                        title={requiresHumanReview ? 'Disabled because this incident requires human review.' : 'Launch Self-Heal'}
                        onClick={() => onNavigateToAutoResolution(selectedRecord.recordId)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors ${requiresHumanReview ? 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-60' : 'text-emerald-800 hover:bg-emerald-100 bg-emerald-50 border border-emerald-200'}`}
                      >
                        <Zap className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Launch Self-Heal</span>
                      </button>
                    )}

                    {onOpenTicketModal && selectedRecord.recordType === 'Incident' && (
                      <button
                        type="button"
                        onClick={() => onOpenTicketModal(selectedRecord)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 bg-white border border-slate-200 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Dossier</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Scrollable Inspection & Analysis Details Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-sidebar-scroll">
                  {/* Original Employee Request Description */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Original Request Description
                    </span>
                    <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 font-mono text-xs text-slate-100 leading-relaxed whitespace-pre-wrap shadow-inner">
                      {selectedRecord.promptText || selectedRecord.description}
                    </div>
                  </div>

                  {/* AI-generated summary: assessment-required ticket field. */}
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block mb-1">
                      AI-Generated Summary
                    </span>
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedTriage?.summary ||
                        selectedTriage?.shortDescription ||
                        selectedTriage?.short_description ||
                        selectedRecord.title ||
                        'Summary not returned by backend'}
                    </p>
                    <p className="text-[10px] text-blue-700 mt-1">
                      Suggested ticket summary only; it is not written to ServiceNow unless a mock sync is confirmed.
                    </p>
                  </div>
                  {/* Attributes Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Detected Intent
                      </span>
                      <p className="font-bold text-blue-700 mt-0.5">
                        {selectedTriage?.intent || selectedTriage?.predicted_intent || selectedRecord.intent || 'Not analyzed'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Category &amp; Subcategory
                      </span>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {triageCategory}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {categoryMismatch
                          ? 'Backend subcategory conflicts with the selected category; verify backend mapping.'
                          : triageSubcategory || selectedRecord.subcategory || 'Not returned by backend'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Impact &amp; Urgency
                      </span>
                      <p className="font-medium text-slate-800 mt-0.5">{selectedTriage?.impact || selectedTriage?.predicted_impact || selectedTriage?.predictedImpact || selectedRecord.impact || 'Not assessed by backend'}</p>
                      <p className="text-[10px] text-slate-500">{selectedTriage?.urgency || selectedTriage?.predicted_urgency || selectedTriage?.predictedUrgency || selectedRecord.urgency || 'Not assessed by backend'}</p>

                      <p className="text-[10px] font-bold uppercase text-slate-500 mt-2">
                        Suggested Priority
                      </p>
                      <p className="font-semibold text-blue-700 mt-0.5">
                        {triageLoading
                          ? 'Analyzing...'
                          : aiSuggestedPriority || 'Not analyzed'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Assignment Group
                      </span>
                      <p className="font-medium text-slate-800 mt-0.5 truncate">
                        {selectedTriage?.recommendedGroup || selectedTriage?.recommended_group || selectedTriage?.assignmentGroup || selectedTriage?.assignment_group || selectedRecord.assignmentGroup || 'Not assigned by backend'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Owner: {selectedRecord.assignee || 'Not assigned'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {retrievalSimilarity !== null && (
                      <p className="text-xs text-slate-600">
                        Retrieval similarity: <strong>{retrievalSimilarity}%</strong> (not a calibrated probability)
                      </p>
                    )}
                    {triageLoading && (
                      <p className="text-xs text-blue-600">Running backend triage...</p>
                    )}
                    {inspectorTriageError && (
                      <p role="alert" className="text-xs text-red-600">{inspectorTriageError}</p>
                    )}
                  </div>

                  {/* Decision Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                    {/* Suggested Resolution */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block font-mono">
                        Recommended Resolution
                      </span>
                      <p className="font-mono text-blue-700 font-semibold text-xs">
                        {selectedTriage?.matchedRunbook || selectedTriage?.matched_runbook || selectedTriage?.recommendedRunbook || selectedTriage?.recommended_runbook || selectedRecord.aiTriage?.recommendedRunbook || 'No backend recommendation available'}
                      </p>
                      {(() => {
                        const resolutionText = selectedTriage?.answer
                          || selectedTriage?.resolution
                          || selectedTriage?.recommended_resolution
                          || selectedRecord.aiTriage?.suggestedAction
                          || 'No action recommendation returned by the backend.';
                        const resolutionSections = String(resolutionText)
                          .split(/•/)
                          .map((section) => section.replace(/^Based on the approved knowledge article\(s\):/i, '').trim())
                          .filter(Boolean);

                        return resolutionSections.length > 1 ? (
                          <div className="space-y-3 pt-1">
                            {resolutionSections.map((section, index) => {
                              const colonIndex = section.indexOf(':');
                              const sectionTitle = colonIndex > 0 ? section.slice(0, colonIndex).trim() : `Resolution guidance ${index + 1}`;
                              const sectionBody = colonIndex > 0 ? section.slice(colonIndex + 1).trim() : section;
                              const steps = sectionBody.split(/(?<=[.!?])\s+/).map((step) => step.trim()).filter(Boolean);

                              return (
                                <div key={`${sectionTitle}-${index}`} className="rounded-lg border border-slate-200 bg-white p-2.5">
                                  <p className="text-[11px] font-semibold text-blue-700 mb-1">{sectionTitle}</p>
                                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600 leading-snug">
                                    {steps.map((step, stepIndex) => (
                                      <li key={`${index}-${stepIndex}`}>{step}</li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <ul className="list-disc pl-4 text-[11px] text-slate-600 leading-snug">
                            {String(resolutionSections[0] || 'No action recommendation returned by the backend.')
                              .split(/(?<=[.!?])\s+/)
                              .map((step, index) => step.trim() && <li key={index}>{step.trim()}</li>)}
                          </ul>
                        );
                      })()}
                    </div>

                    {/* Automation Decision */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 flex flex-col">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block font-mono">
                        Automation Decision
                      </span>

                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${requiresHumanReview ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        <p className="font-bold text-slate-900">{automationDecision}</p>
                      </div>

                      <p className="text-[11px] text-slate-700 leading-relaxed">
                        {decisionExplanation}
                      </p>

                      <div className="border-t border-slate-200 pt-2 mt-2 space-y-1">
                        <p className="text-[11px] text-slate-600">
                          <strong>Retrieval similarity:</strong>{' '}
                          {retrievalSimilarity === null ? 'Not returned' : `${retrievalSimilarity.toFixed(1)}%`}
                        </p>
                        <p className="text-[11px] text-slate-600">
                          <strong>Reference threshold:</strong> {confidenceThreshold}%
                        </p>
                        <p className="text-[11px] text-slate-600">
                          <strong>Knowledge source:</strong> {hasKnowledgeSource ? 'Found' : 'Not found'}
                        </p>
                        <p className="text-[11px] text-slate-600">
                          <strong>Incident risk:</strong> {isCriticalIncident ? 'Critical — human review required' : 'Not identified as critical'}
                        </p>
                      </div>

                      {/* Possible cause stays at the bottom of the Automation Decision card */}
                      <div className="mt-auto pt-4">
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block font-mono">
                            Possible Cause
                          </span>
                          <p className="text-xs text-amber-950 leading-relaxed">
                            {possibleCause}
                          </p>
                          <p className="text-[10px] text-amber-800 leading-relaxed">
                            This is only a possible cause. Check the logs and approved troubleshooting steps to confirm.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Knowledge Source Attribution */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 font-mono">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                        Knowledge Sources Retrieved
                      </span>
                      <span className="text-[10px] font-mono text-blue-700">
                        Index Search: Backend retrieval
                      </span>
                    </div>

                    {associatedArticles.length > 0 ? (
                      <div className="space-y-1.5">
                        {associatedArticles.map((art) => (
                          <div
                            key={art.article_id || art.articleId || art.id || 'KB source'}
                            className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-blue-700">
                                {art.article_id || art.articleId || art.id || 'KB source'}
                              </span>
                              <span className="font-semibold text-slate-800 text-xs">
                                {art.title || art.name || 'Approved knowledge article'}
                              </span>
                            </div>
                            <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                              Approved knowledge article
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white p-3 rounded-xl border border-dashed border-slate-300 text-center text-slate-500 italic text-xs">
                        No verified help article matched for this record.
                      </div>
                    )}
                  </div>

                  {/* Action Status & Execution Record */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-mono">
                        Action Status &amp; Execution Record
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          executionStatus === 'Execution confirmed by backend'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : executionStatus === 'Simulated'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {executionStatus}
                      </span>
                    </div>

                    {recordedExecution ? (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            {recordedExecution.automatedAction}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            Recorded: {recordedExecution.timestamp}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed">
                          {recordedExecution.result}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 text-slate-500 text-xs">
                        No audit entry was found. Execution status remains unverified; a recommendation is not proof that an action ran.
                      </div>
                    )}
                  </div>

                  {/* Escalation Reason & ServiceNow Reference */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs pt-1">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block font-mono">
                        Escalation Reason
                      </span>
                      <p className="font-semibold text-slate-800 text-xs leading-relaxed">
                        {automationDecisionReason}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block font-mono">
                          ServiceNow Reference
                        </span>
                        <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-semibold">
                          Mock adapter
                        </span>
                      </div>
                      <p className="font-mono text-blue-700 font-bold text-xs">
                        {mockServiceNowKey}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {mockServiceNowKey === 'Not synced'
                          ? 'No ServiceNow/mock reference has been returned or persisted for this request yet.'
                          : `Reference is from the record/backend. Mock adapter only; no live ServiceNow connection is claimed.`}
                      </p>
                      {(selectedRecord?.serviceNowStatus || selectedRecord?.servicenow_status || selectedTriage?.serviceNowStatus) && (
                        <p className="text-[10px] text-slate-600 mt-1">
                          Sync status: {selectedRecord?.serviceNowStatus || selectedRecord?.servicenow_status || selectedTriage?.serviceNowStatus}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Bar */}
                  {onNavigateToAutoResolution && (
                    <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2">
                      <span className="text-xs text-slate-500">
                        Review the proposed remediation simulation or CAB policy:
                      </span>
                      <button
                        type="button"
                        disabled={requiresHumanReview}
                        title={requiresHumanReview ? 'Disabled because this incident requires human review.' : 'Open in Self-Heal Engine'}
                        onClick={() => onNavigateToAutoResolution(selectedRecord.recordId)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all ${requiresHumanReview ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'}`}
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Open in Self-Heal Engine</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-400 flex items-center justify-center flex-1">
                Select a ticket or request from the list to inspect AI decisions.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
