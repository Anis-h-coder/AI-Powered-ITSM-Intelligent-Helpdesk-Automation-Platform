import React, { useState, useEffect } from 'react';
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

  // Safety confidence threshold slider (default 70%)
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);

  // Combine incidents and software requests into unified inspectable records
  const allRecords = [
    ...tickets.map((t) => ({
      ...t,
      recordType: 'Incident',
      recordId: t.id,
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
      recordId: r.id,
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
  const [triageLoading, setTriageLoading] = useState(false);
  const [inspectorTriageError, setInspectorTriageError] = useState('');
  const [knowledgeSourceError, setKnowledgeSourceError] = useState('');
  const selectedTriage = selectedRecord
    ? triageByRecord[selectedRecord.recordId] || null
    : null;
  useEffect(() => {
  let active = true;

    const runSelectedTriage = async () => {
      if (!selectedRecord || selectedRecord.recordType !== 'Incident') {
        setInspectorTriageError('');
        setTriageLoading(false);
        return;
      }

      const text = String(
        selectedRecord.description || selectedRecord.title || ''
      ).trim();

      if (text.length < 3) {
        setInspectorTriageError('Incident description is missing.');
        return;
      }

      setTriageLoading(true);
      setInspectorTriageError('');

      try {
        const result = await api.runTriage(text);

        if (!result?.success) {
          throw new Error('Backend did not confirm triage.');
        }

        if (active) {
          setTriageByRecord((previous) => ({
            ...previous,
            [selectedRecord.recordId]: result,
          }));
        }
      } catch (error) {
        if (active) {
          setInspectorTriageError(
            error?.message || 'Backend triage is unavailable.'
          );
        }
      } finally {
        if (active) setTriageLoading(false);
      }
    };

    runSelectedTriage();

    return () => {
      active = false;
    };
  }, [selectedRecord?.recordId, selectedRecord?.description, selectedRecord?.title]);

  // Display only the sources returned with this record's backend triage response.
  // A separate broad search can return unrelated articles and must not be presented as
  // evidence used by the triage decision.
  useEffect(() => {
    const sources = Array.isArray(selectedTriage?.sources) ? selectedTriage.sources : [];
    setAssociatedArticles(sources);
    setKnowledgeSourceError(
      sources.length ? '' :
        selectedTriage ? 'No approved knowledge source matched this triage result.' :
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

  // Check confidence safety
  const recordConfidence = typeof selectedTriage?.confidence === 'number' ? selectedTriage.confidence : null;
  // Retrieval similarity is not a calibrated confidence score and must never auto-approve remediation.
  const isConfidenceSafe = false;
  const hasKnowledgeSource = associatedArticles.length > 0;

  // Mock ServiceNow Reference (Clearly labeled as mock)
  const mockServiceNowKey = selectedRecord?.mockServiceNowId || 'Not synced';

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
        predictedCategory: result.predictedCategory || 'Unknown / Unclassified',
        confidence: typeof result.confidence === 'number' ? `${result.confidence}% retrieval similarity` : 'Not returned',
        suggestedPriority: result.suggestedPriority || 'Needs Assessment',
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

      {/* Notice Banner */}
      <div className="flex items-center gap-3 bg-blue-50/80 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 shadow-xs">
        <Info className="w-4 h-4 text-blue-600 shrink-0" />
        <p className="leading-relaxed">
          <span className="font-semibold text-blue-800">Technical Assessment Transparency:</span> Triage and knowledge matches are requested from the FastAPI backend. Confidence represents retrieval similarity, not a calibrated probability. Hugging Face generation is used only when configured; ServiceNow remains a clearly labelled mock adapter.
        </p>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('inspector')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
              activeTab === 'inspector'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Request Decision Inspector ({allRecords.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sandbox')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
              activeTab === 'sandbox'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Live Classifier Sandbox
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('clusters')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
              activeTab === 'clusters'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Anomaly Clusters (3)
          </button>
        </div>

        {/* Confidence Threshold Config Slider */}
        {activeTab === 'inspector' && (
          <div className="hidden md:flex items-center gap-2.5 text-xs bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            <Sliders className="w-3.5 h-3.5 text-cyan-600" />
            <span className="text-slate-600 font-medium">Reference Threshold (UI only):</span>
            <input
              type="range"
              min="50"
              max="95"
              step="5"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="w-24 accent-blue-600 cursor-pointer"
            />
            <span className="font-mono font-bold text-blue-600 w-8">{confidenceThreshold}%</span>
          </div>
        )}
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
                        Conf: {typeof record.confidenceScore === 'number' ? `${record.confidenceScore}%` : 'Not analyzed'}
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
                <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                      <PriorityBadge priority={selectedRecord.priority} />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                      {selectedRecord.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {onNavigateToAutoResolution && (
                      <button
                        type="button"
                        onClick={() => onNavigateToAutoResolution(selectedRecord.recordId)}
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 bg-emerald-50 border border-emerald-200 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
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

                  {/* Attributes Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Detected Intent
                      </span>
                      <p className="font-bold text-blue-700 mt-0.5">
                        {selectedTriage?.intent || selectedRecord.intent || 'Not analyzed'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Category &amp; Subcategory
                      </span>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {selectedTriage?.predictedCategory || 'Not analyzed'}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">{selectedTriage?.subcategory || selectedRecord.subcategory || 'Not returned by backend'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Impact &amp; Urgency
                      </span>
                      <p className="font-medium text-slate-800 mt-0.5">{selectedTriage?.impact || selectedRecord.impact || 'Not assessed by backend'}</p>
                      <p className="text-[10px] text-slate-500">{selectedTriage?.urgency || selectedRecord.urgency || 'Not assessed by backend'}</p>

                      <p className="text-[10px] font-bold uppercase text-slate-500 mt-2">
                        Suggested Priority
                      </p>
                      <p className="font-semibold text-blue-700 mt-0.5">
                        {triageLoading
                          ? 'Analyzing...'
                          : selectedTriage?.suggestedPriority || 'Not analyzed'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">
                        Assignment Group
                      </span>
                      <p className="font-medium text-slate-800 mt-0.5 truncate">
                        {selectedTriage?.recommendedGroup || selectedRecord.assignmentGroup || 'Not assigned by backend'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Owner: {selectedRecord.assignee || 'Not assigned'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {typeof selectedTriage?.confidence === 'number' && (
                      <p className="text-xs text-slate-600">
                        Retrieval similarity: <strong>{selectedTriage.confidence}%</strong> (not a calibrated probability)
                      </p>
                    )}
                    {triageLoading && (
                      <p className="text-xs text-blue-600">Running backend triage...</p>
                    )}
                    {inspectorTriageError && (
                      <p role="alert" className="text-xs text-red-600">{inspectorTriageError}</p>
                    )}
                  </div>

                  {/* Safety & Confidence Evaluation Banner */}
                  <div className="p-3.5 rounded-xl border bg-amber-50 border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">Human review required</div>
                      <p className="text-[11px] mt-0.5 leading-relaxed text-slate-600">
                        Backend retrieval similarity is evidence relevance, not a calibrated confidence score. This screen does not approve or execute automated remediation. Confirm the incident and approved runbook before taking action.
                      </p>
                    </div>
                  </div>

                  {/* Decision Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                    {/* Suggested Resolution */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block font-mono">
                        Recommended Resolution
                      </span>
                      <p className="font-mono text-blue-700 font-semibold text-xs">
                        {selectedTriage?.matchedRunbook || selectedRecord.aiTriage?.recommendedRunbook || 'No backend recommendation available'}
                      </p>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        {selectedTriage?.answer || selectedRecord.aiTriage?.suggestedAction || 'No action recommendation returned by the backend.'}
                      </p>
                    </div>

                    {/* Automation Decision */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block font-mono">
                        Automation Decision
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isConfidenceSafe && hasKnowledgeSource ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        <p className="font-bold text-slate-900">
                          {selectedRecord.status === 'Escalated'
                            ? 'Escalated for Human Review'
                            : hasKnowledgeSource
                            ? 'Runbook Found — Human Confirmation Required'
                            : 'Human Review Needed — No Matching Help Article'}
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {selectedRecord.status === 'Resolved'
                          ? 'Stored record status is Resolved. This screen has not independently verified that a real remediation was executed.'
                          : selectedRecord.status === 'Escalated'
                          ? 'Stored record status is Escalated. Human review is required; verify the handoff in the support workflow.'
                          : 'Current stored status: ' + (selectedRecord.status || 'Unknown') + '. A recommendation or matching article does not mean the issue is resolved.'}
                      </p>
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
                            key={art.article_id || art.id}
                            className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-blue-700">
                                {art.article_id || art.id}
                              </span>
                              <span className="font-semibold text-slate-800 text-xs">
                                {art.title}
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
                      <p className="font-semibold text-slate-800 text-xs">
                        {selectedRecord.status === 'Escalated'
                          ? 'The stored record is marked Escalated. Verify the escalation reason in the incident record or audit trail.'
                          : !selectedTriage
                          ? 'Backend triage has not returned a result for this record yet.'
                          : selectedTriage.escalated
                          ? 'Backend triage recommends human review because its knowledge-retrieval result was insufficient.'
                          : !hasKnowledgeSource
                          ? (knowledgeSourceError || 'No source was returned with triage; human review is required.')
                          : 'A knowledge source was returned. This is a recommendation only; no real remediation is verified.'}
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
                        A mock ServiceNow reference appears only after a persisted mock sync; no live ServiceNow connection is claimed.
                      </p>
                    </div>
                  </div>

                  {/* Bottom Action Bar */}
                  {onNavigateToAutoResolution && (
                    <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-slate-500">
                        Review the proposed remediation simulation or CAB policy:
                      </span>
                      <button
                        type="button"
                        onClick={() => onNavigateToAutoResolution(selectedRecord.recordId)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
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

      {/* ============================================================ */}
      {/* TAB 2: LIVE CLASSIFIER SANDBOX */}
      {/* ============================================================ */}
      {activeTab === 'sandbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-cyan-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Interactive Triage Sandbox
                </h3>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-mono font-medium">
                Live Tester
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Select Sample IT Scenario
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TRIAGE_SIMULATION_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputText(preset.text);
                      handleRunSimulation(preset.text);
                    }}
                    className="px-2.5 py-1 text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-lg border border-slate-200 transition-colors text-left"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Raw Ticket Description to Analyze
              </label>
              <textarea
                rows={5}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter technical problem details, error traces, or requests..."
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-cyan-500 font-mono leading-relaxed"
              />
            </div>

            <button
              type="button"
              onClick={() => handleRunSimulation()}
              disabled={isSimulating}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Analyzing Syntax &amp; Context...
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  Run AI Triage Simulation
                </>
              )}
            </button>
          </div>

          {/* Focal Dark Card for Classification & Routing Output */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-4 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  Classification &amp; Routing Output
                </h3>
              </div>
              <span className="text-[10px] text-cyan-400 font-mono">
                Backend result (latency not measured here)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block font-mono">
                  Predicted Category
                </span>
                <p className="text-sm font-bold text-white mt-1">
                  {simulationResult.predictedCategory}
                </p>
                <p className="text-[11px] text-cyan-300 font-mono mt-0.5">
                  Model Confidence: {simulationResult.confidence}
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block font-mono">
                  Suggested Priority &amp; SLA
                </span>
                <div className="mt-1">
                  <PriorityBadge priority={simulationResult.suggestedPriority} />
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  {simulationResult.priorityReasoning}
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block font-mono">
                  Sentiment &amp; Escalation Risk
                </span>
                <p className="text-xs font-semibold text-white mt-1">
                  {simulationResult.sentiment}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Calculated Risk Score: {simulationResult.sentimentScore}
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block font-mono">
                  Assigned Queue &amp; Routing
                </span>
                <p className="text-xs font-semibold text-white mt-1">
                  {simulationResult.recommendedGroup}
                </p>
                <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
                  Routing suggestion only — no automatic dispatch
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-indigo-950/50 rounded-xl border border-indigo-800/60 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-cyan-300">
                  Matched Enterprise Runbook (SOP)
                </span>
                <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800/60">
                  Automation Candidate
                </span>
              </div>
              <p className="font-mono text-cyan-200 text-xs font-bold">
                {simulationResult.matchedRunbook}
              </p>
              <p className="text-[11px] text-slate-300">
                Deflection Feasibility: {simulationResult.deflectionFeasibility}
              </p>
              {triageError && <p role="alert" className="text-xs text-rose-300 mt-2">{triageError}</p>}
              {simulationResult.answer && <p className="text-xs text-slate-200 whitespace-pre-wrap mt-3">{simulationResult.answer}</p>}
              {simulationResult.sources?.length > 0 && <div className="mt-3 border-t border-indigo-800/60 pt-2"><p className="text-[10px] uppercase font-bold text-cyan-300">Retrieved sources</p>{simulationResult.sources.map((source) => <p key={source.article_id} className="text-[11px] text-slate-200 mt-1">{source.article_id} · {source.title} · score {source.score}</p>)}</div>}
              {simulationResult.escalated && <p className="text-xs text-amber-200 mt-2">Human review required: evidence did not meet the safety threshold.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: ANOMALY CLUSTERS */}
      {/* ============================================================ */}
      {activeTab === 'clusters' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-600" />
                Incident Clusters &amp; Anomaly Correlation (Demo Data)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                These sample clusters illustrate the UI; live clustering is not connected to the backend yet.
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded-lg border border-cyan-200 font-medium">
              Demo clusters (sample data)
            </span>
          </div>

          {clusterActionNotice && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-xs flex items-center justify-between">
              <span>{clusterActionNotice.message}</span>
              <button
                onClick={() => setClusterActionNotice(null)}
                className="text-emerald-700 font-semibold px-2 hover:underline"
              >
                OK
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {AI_INCIDENT_CLUSTERS.map((cluster) => (
              <div
                key={cluster.id}
                className="bg-white border border-slate-200 hover:border-cyan-300 rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all group card-elevate shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {cluster.id}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {cluster.firstDetected}
                    </span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1 leading-snug group-hover:text-cyan-700 transition-colors">
                    {cluster.title}
                  </h4>

                  <div className="flex items-center gap-2 mb-3 text-[11px] text-slate-500">
                    <span className="font-semibold text-rose-600">{cluster.affectedUsers} Users Affected</span>
                    <span>•</span>
                    <span className="font-mono">Conf: {(cluster.confidenceScore * 100).toFixed(0)}%</span>
                  </div>

                  <div className="text-[11px] space-y-2 mb-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-slate-700">
                      <span className="font-semibold text-slate-900 block mb-0.5">Root Cause Hypothesis:</span>
                      {cluster.rootCauseHypothesis}
                    </p>
                    <p className="text-slate-600 pt-1.5 border-t border-slate-200">
                      <span className="font-semibold text-cyan-800 block mb-0.5">Recommended Action:</span>
                      {cluster.recommendedRemediation}
                    </p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {cluster.status}
                  </span>
                  <button
                    onClick={() => handleSimulateClusterAction(cluster.id, 'Broadcast Alert & Mitigation')}
                    className="text-xs font-semibold text-cyan-700 hover:text-cyan-800 flex items-center gap-1 transition-colors"
                  >
                    Run demo simulation <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
