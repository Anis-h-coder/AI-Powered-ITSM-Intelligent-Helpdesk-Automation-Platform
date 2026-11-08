import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
  BrainCircuit,
  LayoutDashboard,
  UserCheck,
  BookOpen,
  CheckCircle2,
  Clock,
  TrendingDown,
  Layers,
  ChevronRight,
  Cpu,
  Lock,
  RefreshCw,
  FileText,
  Activity,
  AlertTriangle,
  Play,
  Terminal,
  Search,
  Database,
  Server,
  Network,
  Key,
  Laptop,
  Check,
  ExternalLink,
  Code2,
  RotateCcw,
  User,
  ShieldCheck,
  AlertOctagon,
  Info
} from 'lucide-react';

// High-fidelity visual assets
import heroAiCanvasImg from '../assets/images/hero_ai_itsm_canvas_1791798248403.jpg';
import neuralTriageImg from '../assets/images/neural_triage_graph_1791798259622.jpg';
import selfHealingImg from '../assets/images/self_healing_engine_1791798271627.jpg';
import knowledgeVaultImg from '../assets/images/knowledge_vector_vault_1791798284437.jpg';
import itOpsDashboardImg from '../assets/images/it_ops_dashboard_banner_1791874919399.jpg';

export function LandingPage({
  onNavigateTab,
  tickets = [],
  softwareRequests = [],
  auditLogs = [],
  onOpenTechModal
}) {
  // Workflow step selection (0: Report, 1: Analyse, 2: Find Solution, 3: Resolve/Escalate)
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);

  // Simulation Console State
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState(0);
  const [consoleViewMode, setConsoleViewMode] = useState('summary'); // 'summary' | 'logs'
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(100);
  const [simulationLogs, setSimulationLogs] = useState([]);

  // Interactive Live Issue Triage State
  const [customPrompt, setCustomPrompt] = useState('');
  const [triageResult, setTriageResult] = useState(null);
  const [isTriaging, setIsTriaging] = useState(false);

  // 1. Four-stage IT support workflow in clear, natural English
  const workflowStages = [
    {
      step: '01',
      title: 'Report an Issue',
      description: 'An employee submits an IT problem in their own words through our intake channels.',
      subtext: 'Employees report IT issues through the Employee Self-Service Portal or supported intake channels. Example: "VPN Connection Issue". Note: Ticket intake is simulated in this platform.',
      badgeText: 'Stage 1 • Issue Reporting',
      badgeColor: 'text-blue-400 bg-blue-950/60 border-blue-800/60',
      icon: UserCheck,
      channel: 'Employee Intake (Self-Service Portal)',
      sampleInput: 'Reported Issue: "VPN Connection Issue"',
      systemAction: 'The ticket intake is recorded and queued for AI analysis in the simulation.',
      executionDetails: {
        'Simulated Intake Time': '0.12 seconds',
        'Current Status': 'Received & Queued (Simulated)',
        'Input Format': 'User-submitted IT scenario',
        'Safety Verification': 'Simulated — safety checks have not been independently verified'
      }
    },
    {
      step: '02',
      title: 'Analyse the Issue',
      description: 'AI identifies the problem category, estimates priority, and evaluates automation safety.',
      subtext: 'The AI triage component analyzes the issue (e.g., VPN Connection Issue), identifies the category, estimates priority (e.g., P2 High), urgency, and evaluates automation safety.',
      badgeText: 'Stage 2 • AI-Based Issue Analysis',
      badgeColor: 'text-purple-400 bg-purple-950/60 border-purple-800/60',
      icon: BrainCircuit,
      channel: 'AI Incident Triage',
      sampleInput: 'AI Classification: Category = Network & VPN • Priority = P2 High • Impact = Work Impacting',
      systemAction: 'The system simulates symptom classification and risk evaluation for the VPN issue.',
      executionDetails: {
        'Simulated Analysis Time': '0.34 seconds',
        'Identified Category': 'Network & VPN',
        'Confidence Rating': 'High (Illustrative)',
        'Safety Verification': 'Simulated — safety checks have not been independently verified'
      }
    },
    {
      step: '03',
      title: 'Find a Solution',
      description: 'The system searches the knowledge base for a verified troubleshooting guide.',
      subtext: 'Using Retrieval-Augmented Generation (RAG), the system searches approved company standard operating procedures (SOPs) to find the exact steps to solve the issue.',
      badgeText: 'Stage 3 • Match with Approved Troubleshooting Guide',
      badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
      icon: BookOpen,
      channel: 'Verified IT Knowledge Base (RAG Search)',
      sampleInput: 'Matched Guide: "KB-1001 — VPN Connection Troubleshooting"',
      systemAction: 'The system extracts safe troubleshooting steps and validates if an automated fix is permissible.',
      executionDetails: {
        'Simulated Search Duration': '0.28 seconds',
        'Matched Procedure': 'KB-1001 — VPN Connection Troubleshooting',
        'Relevance Score': 'High (Illustrative)',
        'Safety Verification': 'Simulated — safety checks have not been independently verified'
      }
    },
    {
      step: '04',
      title: 'Resolve or Escalate',
      description: 'The system uses AI triage results and relevant knowledge-base procedures to determine whether an incident is eligible for safe automated resolution or requires human intervention.',
      subtext: 'The system simulates low-risk diagnostic actions. High-risk actions, including password resets, access changes and server reboots, require IT staff approval and must not execute automatically. The system records the simulated execution outcome for audit purposes and escalates incidents that cannot be safely resolved.',
      badgeText: 'Stage 4 • Automated Issue Resolution',
      badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60',
      icon: Zap,
      channel: 'Automated Resolution & Human Escalation',
      sampleInput: 'VPN Connection Issue',
      systemAction: 'The system simulates resolution using RAG-retrieved troubleshooting procedures and triage priority. The simulated outcome is recorded for audit purposes. If safe resolution cannot be established, the incident is escalated to IT support.',
      executionDetails: {
        'Simulated Execution Time': '1.40 seconds',
        'Final Status': 'Resolved (Simulated)',
        'Escalation Policy': 'Human approval required for high-risk actions',
        'Audit Logging': 'Simulated execution and outcome recorded',
        'Safety Verification': 'Simulated — safety checks have not been independently verified'
      }
    }
  ];

  // 2. Interactive Scenarios for the Simulation Console in natural English
  const interactiveScenarios = [
    {
      id: 'wifi-issue',
      title: 'Wi-Fi Connectivity Issue',
      category: 'Network & Connectivity',
      priority: 'P3 Medium',
      priorityExplanation: 'Medium priority because employee cannot connect to office wireless network.',
      rawText: 'Employee cannot connect to the office Wi-Fi network.',
      aiAnalysisSummary: 'Possible network adapter, authentication or connectivity issue.',
      matchedSopTitle: 'Wi-Fi Connectivity Troubleshooting Guide',
      matchedSopCode: 'KB-1004',
      sopSelectionReason: 'Selected because error matches corporate wireless supplicant troubleshooting protocol.',
      proposedFix: 'Check Wi-Fi status and follow approved network troubleshooting steps.',
      safetyCheckText: 'Low-risk checks may be automated. Escalate if unresolved.',
      requiresApproval: false,
      statusLabel: 'Completed (Simulated Fix)',
      statusColor: 'emerald',
      plainEnglishSteps: [
        '1. Intake: Employee reported inability to connect to office Wi-Fi.',
        '2. Analysis: AI identified possible network adapter, authentication or connectivity issue.',
        '3. Guide Matched: Selected Wi-Fi Connectivity Troubleshooting Guide (KB-1004).',
        '4. Safety Check: Low-risk checks may be automated. Escalate if unresolved.',
        '5. Resolution: Checked Wi-Fi status and followed approved network troubleshooting steps.',
        '6. Verified: Status checked and logged successfully.'
      ],
      logs: [
        '[09:41:01] Received report: "Employee cannot connect to the office Wi-Fi network."',
        '[09:41:01] AI identified issue type: Possible network adapter, authentication or connectivity issue.',
        '[09:41:02] Knowledge search: Matched Wi-Fi Connectivity Troubleshooting Guide (KB-1004)',
        '[09:41:02] Safety check passed: Low-risk checks may be automated. Escalate if unresolved.',
        '[09:41:03] Checking Wi-Fi status and approved network troubleshooting steps...',
        '[09:41:04] Simulation verified: Status checked successfully.'
      ]
    },
    {
      id: 'vpn-issue',
      title: 'VPN Connection Issue',
      category: 'Network & VPN',
      priority: 'P2 High',
      priorityExplanation: 'High priority because remote worker cannot access internal systems.',
      rawText: 'Employee cannot connect to the company VPN while working from home.',
      aiAnalysisSummary: 'Possible VPN configuration, authentication or connectivity issue.',
      matchedSopTitle: 'VPN Connection Troubleshooting Guide',
      matchedSopCode: 'KB-1001',
      sopSelectionReason: 'Selected because remote connection issue matches VPN troubleshooting guide.',
      proposedFix: 'Check network connectivity and VPN settings using the approved troubleshooting guide.',
      safetyCheckText: 'Do not bypass security controls or issue access tokens without authorization.',
      requiresApproval: true,
      statusLabel: 'Awaiting Authorization',
      statusColor: 'amber',
      plainEnglishSteps: [
        '1. Intake: Employee reported inability to connect to company VPN while working from home.',
        '2. Analysis: AI identified possible VPN configuration, authentication or connectivity issue.',
        '3. Guide Matched: Selected VPN Connection Troubleshooting Guide (KB-1001).',
        '4. Safety Check: Do not bypass security controls or issue access tokens without authorization.',
        '5. Resolution: Checked network connectivity and VPN settings using the approved troubleshooting guide.',
        '6. Current Status: Awaiting authorized credential verification.'
      ],
      logs: [
        '[09:41:05] Received report: "Employee cannot connect to the company VPN while working from home."',
        '[09:41:05] AI identified issue type: Possible VPN configuration, authentication or connectivity issue.',
        '[09:41:06] Knowledge search: Matched VPN Connection Troubleshooting Guide (KB-1001)',
        '[09:41:06] Safety check: Do not bypass security controls or issue access tokens without authorization.',
        '[09:41:07] Checking network connectivity and VPN settings using the approved troubleshooting guide...',
        '[09:41:08] Simulation paused. Awaiting authorization.'
      ]
    },
    {
      id: 'password-lockout',
      title: 'Expired Password / Account Lockout',
      category: 'Identity & Access',
      priority: 'P2 High',
      priorityExplanation: 'High priority because user is blocked from signing into workstation.',
      rawText: 'Employee cannot sign in because the password has expired or the account is locked.',
      aiAnalysisSummary: 'Possible password expiration or account lockout.',
      matchedSopTitle: 'Password and Account Recovery Guide',
      matchedSopCode: 'KB-1002',
      sopSelectionReason: 'Selected because password expiration and account lockout match recovery standard.',
      proposedFix: 'Direct the employee to the approved password-reset process or human IT support.',
      safetyCheckText: "Identity verification is required. Never request or display the employee's password.",
      requiresApproval: true,
      statusLabel: 'Awaiting Identity Verification',
      statusColor: 'amber',
      plainEnglishSteps: [
        '1. Intake: Employee reported cannot sign in because the password has expired or the account is locked.',
        '2. Analysis: AI identified possible password expiration or account lockout.',
        '3. Guide Matched: Selected Password and Account Recovery Guide (KB-1002).',
        '4. Safety Check: Identity verification is required. Never request or display the employee\'s password.',
        '5. Resolution: Directed the employee to the approved password-reset process or human IT support.',
        '6. Current Status: Awaiting verified identity confirmation.'
      ],
      logs: [
        '[09:41:10] Received report: "Employee cannot sign in because the password has expired or the account is locked."',
        '[09:41:10] AI identified issue type: Possible password expiration or account lockout.',
        '[09:41:11] Knowledge search: Matched Password and Account Recovery Guide (KB-1002)',
        '[09:41:11] Safety check: Identity verification is required. Never request or display the employee\'s password.',
        '[09:41:12] Directing the employee to the approved password-reset process or human IT support...',
        '[09:41:13] Execution paused. Awaiting identity verification.'
      ]
    },
    {
      id: 'outlook-sync',
      title: 'Outlook Sync Issue',
      category: 'Email & O365',
      priority: 'P3 Medium',
      priorityExplanation: 'Medium priority because mailbox sync is frozen but webmail remains accessible.',
      rawText: 'Outlook is not syncing new emails.',
      aiAnalysisSummary: 'Possible connectivity, offline mode or mailbox synchronization issue.',
      matchedSopTitle: 'Outlook Email Synchronization Guide',
      matchedSopCode: 'KB-1003',
      sopSelectionReason: 'Selected because email synchronization issue matches Outlook guide.',
      proposedFix: 'Check connectivity, synchronization status and approved troubleshooting steps.',
      safetyCheckText: 'Do not delete mailbox data or change account settings without authorization.',
      requiresApproval: false,
      statusLabel: 'Completed (Simulated Fix)',
      statusColor: 'emerald',
      plainEnglishSteps: [
        '1. Intake: Employee reported Outlook is not syncing new emails.',
        '2. Analysis: AI identified possible connectivity, offline mode or mailbox synchronization issue.',
        '3. Guide Matched: Selected Outlook Email Synchronization Guide (KB-1003).',
        '4. Safety Check: Do not delete mailbox data or change account settings without authorization.',
        '5. Resolution: Checked connectivity, synchronization status and approved troubleshooting steps.',
        '6. Verified: Sync status checked successfully.'
      ],
      logs: [
        '[09:41:15] Received report: "Outlook is not syncing new emails."',
        '[09:41:15] AI identified issue type: Possible connectivity, offline mode or mailbox synchronization issue.',
        '[09:41:16] Knowledge search: Matched Outlook Email Synchronization Guide (KB-1003)',
        '[09:41:16] Safety check: Do not delete mailbox data or change account settings without authorization.',
        '[09:41:17] Checking connectivity, synchronization status and approved troubleshooting steps...',
        '[09:41:18] Simulation verified: Sync status checked.'
      ]
    },
    {
      id: 'software-request',
      title: 'Software Installation Request',
      category: 'Software & Licensing',
      priority: 'P4 Low',
      priorityExplanation: 'Low priority standard employee request for catalog software.',
      rawText: 'Employee requests installation of software on their laptop.',
      aiAnalysisSummary: 'Software installation request requiring catalog and policy verification.',
      matchedSopTitle: 'Software Installation Request Guide',
      matchedSopCode: 'KB-1005',
      sopSelectionReason: 'Selected because software installation request matches catalog policy.',
      proposedFix: 'Verify approval, software eligibility and device requirements before installation.',
      safetyCheckText: 'Installation must follow required approval. Label demo actions as simulated.',
      requiresApproval: true,
      statusLabel: 'Awaiting Catalog Approval',
      statusColor: 'amber',
      plainEnglishSteps: [
        '1. Intake: Employee requests installation of software on their laptop.',
        '2. Analysis: AI identified software installation request requiring catalog and policy verification.',
        '3. Guide Matched: Selected Software Installation Request Guide (KB-1005).',
        '4. Safety Check: Installation must follow required approval. Label demo actions as simulated.',
        '5. Resolution: Verified approval, software eligibility and device requirements before installation.',
        '6. Current Status: Awaiting manager or catalog approval.'
      ],
      logs: [
        '[09:41:20] Received request: "Employee requests installation of software on their laptop."',
        '[09:41:20] AI identified issue type: Software installation request requiring catalog and policy verification.',
        '[09:41:21] Knowledge search: Matched Software Installation Request Guide (KB-1005)',
        '[09:41:21] Safety check: Installation must follow required approval. Label demo actions as simulated.',
        '[09:41:22] Verifying approval, software eligibility and device requirements before installation...',
        '[09:41:23] Simulation paused. Awaiting required approval.'
      ]
    },
    {
      id: 'critical-outage',
      title: 'Critical Infrastructure Outage',
      category: 'Cloud Infrastructure',
      priority: 'P1 Critical',
      priorityExplanation: 'Critical priority because core company services and databases are unavailable.',
      rawText: 'An important company IT service or infrastructure component is unavailable.',
      aiAnalysisSummary: 'Potential major service disruption requiring immediate IT investigation.',
      matchedSopTitle: 'Infrastructure Outage Protocol',
      matchedSopCode: 'KB-1006',
      sopSelectionReason: 'Selected verified Major Incident Response Procedure for critical outage.',
      proposedFix: 'Escalate to the responsible IT team and notify the incident owner according to policy.',
      safetyCheckText: 'Human escalation required. Do not perform automatic infrastructure changes or claim the service has been repaired.',
      requiresApproval: true,
      statusLabel: 'Escalated to Human IT Team',
      statusColor: 'amber',
      plainEnglishSteps: [
        '1. Intake: Alert reported an important company IT service or infrastructure component is unavailable.',
        '2. Analysis: AI identified potential major service disruption requiring immediate IT investigation.',
        '3. Guide Matched: Selected Infrastructure Outage Protocol (KB-1006).',
        '4. Safety Check: Human escalation required. Do not perform automatic infrastructure changes or claim the service has been repaired.',
        '5. Action Taken: Escalated to the responsible IT team and notified the incident owner according to policy.',
        '6. Current Status: Escalated to human IT team.'
      ],
      logs: [
        '[09:41:25] Received alert: "An important company IT service or infrastructure component is unavailable."',
        '[09:41:25] AI identified issue type: Potential major service disruption requiring immediate IT investigation.',
        '[09:41:26] Knowledge search: Matched Infrastructure Outage Protocol (KB-1006)',
        '[09:41:26] Safety check: Human escalation required. Do not perform automatic infrastructure changes or claim the service has been repaired.',
        '[09:41:27] Escalating to the responsible IT team and notifying the incident owner according to policy...',
        '[09:41:28] Escalation completed successfully.'
      ]
    },
    {
      id: 'unknown-question',
      title: 'Unknown IT Question',
      category: 'General IT',
      priority: 'P3 Medium',
      priorityExplanation: 'Needs assessment: inquiry cannot be answered using available knowledge base.',
      rawText: 'An employee asks an IT question that cannot be answered using the available knowledge base.',
      aiAnalysisSummary: 'Insufficient verified evidence to provide a reliable answer.',
      matchedSopTitle: 'No relevant guide found.',
      matchedSopCode: 'N/A',
      sopSelectionReason: 'Selected anti-hallucination guardrail because verified knowledge is unavailable.',
      proposedFix: 'Escalate the question to a human IT support agent.',
      safetyCheckText: 'Human review required. Do not invent answers or unsupported troubleshooting steps.',
      requiresApproval: true,
      statusLabel: 'Escalated to Human IT Support',
      statusColor: 'amber',
      plainEnglishSteps: [
        '1. Intake: Employee submitted an IT question that cannot be answered using the available knowledge base.',
        '2. Analysis: AI identified insufficient verified evidence to provide a reliable answer.',
        '3. Guide Matched: No relevant guide found.',
        '4. Safety Check: Human review required. Do not invent answers or unsupported troubleshooting steps.',
        '5. Action Taken: Escalated the question to a human IT support agent.',
        '6. Current Status: Routed to human support agent queue.'
      ],
      logs: [
        '[09:41:30] Received query: "An employee asks an IT question that cannot be answered using the available knowledge base."',
        '[09:41:30] AI retrieval check: Insufficient verified evidence to provide a reliable answer.',
        '[09:41:31] Knowledge search: No relevant guide found.',
        '[09:41:31] Safety check: Human review required. Do not invent answers or unsupported troubleshooting steps.',
        '[09:41:32] Escalating the question to a human IT support agent...',
        '[09:41:33] Ticket routed to human support successfully.'
      ]
    }
  ];

  // Synchronize logs when scenario changes
  useEffect(() => {
    setSimulationLogs(interactiveScenarios[selectedScenarioIdx].logs);
  }, [selectedScenarioIdx]);

  // Handle re-running the interactive simulation
  const handleRunSimulation = () => {
    setIsSimulating(true);
    setSimulationProgress(0);
    setSimulationLogs([]);

    const fullLogs = interactiveScenarios[selectedScenarioIdx].logs;
    let currentLogIndex = 0;

    const interval = setInterval(() => {
      if (currentLogIndex < fullLogs.length) {
        setSimulationLogs((prev) => [...prev, fullLogs[currentLogIndex]]);
        setSimulationProgress(Math.round(((currentLogIndex + 1) / fullLogs.length) * 100));
        currentLogIndex += 1;
      } else {
        clearInterval(interval);
        setIsSimulating(false);
      }
    }, 400);
  };

  // 3. Five Core Platform Modules in clear, natural English
  const coreFeatures = [
    {
      id: 'employee-self-service',
      title: 'Employee Self-Service Portal',
      description: 'A user-friendly portal where employees can report IT problems, get instant troubleshooting answers from an AI chatbot, request approved software, and track ticket status.',
      icon: UserCheck,
      badge: 'Employee Portal',
      targetTab: 'employee-self-service',
      actionText: 'Open Employee Portal',
      imageAsset: heroAiCanvasImg,
      highlights: [
        'Report IT issues in simple everyday language',
        'AI chat assistant provides instant answers and guided troubleshooting',
        'Request pre-approved corporate software from the catalog',
        'Track active ticket progress and resolution status in real time'
      ]
    },
    {
      id: 'itsm-dashboard',
      title: 'ITSM Operations Dashboard',
      description: 'A central operations workspace where IT support teams view active tickets, monitor response time targets, manage technician assignments, and track issue status.',
      icon: LayoutDashboard,
      badge: 'Operations Desk',
      targetTab: 'itsm-dashboard',
      actionText: 'Explore ITSM Dashboard',
      imageAsset: itOpsDashboardImg,
      highlights: [
        'Central incident queue with priority and status filters',
        'Service Level Target (SLA) countdown tracking for every issue',
        'Manage software requests and support team assignments',
        'Complete audit history of all manual and automated actions'
      ]
    },
    {
      id: 'ai-analysis',
      title: 'AI Analysis & Incident Triage',
      description: 'The AI engine automatically reads reported problems, identifies the issue type, estimates urgency, and recommends the best troubleshooting guide.',
      icon: BrainCircuit,
      badge: 'AI Incident Triage',
      targetTab: 'ai-analysis',
      actionText: 'Inspect AI Triage',
      imageAsset: neuralTriageImg,
      highlights: [
        'Automatically categorizes tickets with clear confidence percentages',
        'Estimates business urgency and sets priority ratings (P1 to P4)',
        'Groups similar tickets together to detect potential outages early',
        'Recommends verified step-by-step troubleshooting procedures'
      ]
    },
    {
      id: 'auto-resolution',
      title: 'Auto-Resolution & Self-Healing',
      description: 'Matches routine IT problems with approved troubleshooting procedures and simulates safe automated fixes with built-in safety checks and human approvals.',
      icon: Zap,
      badge: 'Automated Fixes',
      targetTab: 'auto-resolution',
      actionText: 'Test Auto-Resolution',
      imageAsset: selfHealingImg,
      highlights: [
        'Simulates automated fixes for common network, account, and application issues',
        'Built-in safety checks prevent risky actions from executing automatically',
        'High-risk operations (like database restarts) pause for human IT manager approval',
        'Complete session audit log recording every automated step'
      ]
    },
    {
      id: 'knowledge-base',
      title: 'IT Knowledge Base',
      description: 'A curated library of verified troubleshooting guides and standard operating procedures (SOPs) that both employees and the AI reference to solve problems.',
      icon: BookOpen,
      badge: 'Verified Knowledge',
      targetTab: 'knowledge-base',
      actionText: 'Browse Knowledge Base',
      imageAsset: knowledgeVaultImg,
      highlights: [
        'Verified troubleshooting guides for common workplace technical problems',
        'Step-by-step instructions tested and approved by IT specialists',
        'Used by AI to ground recommendations in real company documentation (RAG)',
        'Organized into Network, Accounts, Software, and Hardware categories'
      ]
    }
  ];

  // 4. Quick Prompt Triage Playground with clear explanations
  const handleQuickTriage = (prompt) => {
    setIsTriaging(true);
    setCustomPrompt(prompt);
    setTimeout(() => {
      const lower = prompt.toLowerCase();
      let res = {
        category: 'Unknown / Unclassified',
        priority: 'Needs Assessment',
        urgency: 'Pending Human Review',
        sopMatch: 'No relevant guide found',
        safeToAutomate: false,
        safetyStatusText: 'Human review required. Do not invent answers or unsupported troubleshooting steps.',
        explanation: 'Insufficient verified knowledge-base evidence. Escalated to a human IT support agent.'
      };

      if (lower.includes('wi-fi') || lower.includes('wifi') || lower.includes('office wi-fi')) {
        res = {
          category: 'Network & Connectivity',
          priority: 'P3 Medium',
          urgency: 'Work Impacting (Local Connectivity)',
          sopMatch: 'KB-1004: Wi-Fi Connectivity Problems',
          safeToAutomate: true,
          safetyStatusText: 'Low-risk diagnostic checks may be automated. Escalate if unresolved.',
          explanation: 'AI detected a Wi-Fi issue. Safe diagnostics initiated. No configuration changes will be made.'
        };
      } else if (lower.includes('vpn')) {
        res = {
          category: 'Network & VPN',
          priority: 'P2 High',
          urgency: 'Work Impacting (Remote Access)',
          sopMatch: 'KB-1001: VPN Connection Troubleshooting',
          safeToAutomate: false,
          safetyStatusText: 'Do not bypass security controls or issue access tokens without authorization.',
          explanation: 'AI detected a VPN connection issue. Matches approved VPN troubleshooting guide.'
        };
      } else if (lower.includes('password') || lower.includes('lockout') || lower.includes('sign in')) {
        res = {
          category: 'Identity & Access',
          priority: 'P2 High',
          urgency: 'Authentication Blocker',
          sopMatch: 'KB-1002: Password Reset and Account Unlock',
          safeToAutomate: false,
          safetyStatusText: 'Identity verification is required. Never request or display the employee\'s password.',
          explanation: 'AI identified a password/lockout issue. Routes to secure recovery process.'
        };
      } else if (lower.includes('outlook') || lower.includes('sync') || lower.includes('emails')) {
        res = {
          category: 'Email & O365',
          priority: 'P3 Medium',
          urgency: 'Mailbox Sync Issue',
          sopMatch: 'KB-1003: Outlook Synchronization Issues',
          safeToAutomate: true,
          safetyStatusText: 'Safe for Automated Fix: Performing non-destructive diagnostic checks only.',
          explanation: 'AI detected an Outlook sync issue. Running connectivity and sync status diagnostics. Destructive actions prohibited.'
        };
      } else if (lower.includes('software') || lower.includes('installation')) {
        res = {
          category: 'Software & Licensing',
          priority: 'P4 Low',
          urgency: 'Standard Request',
          sopMatch: 'KB-1005: Software Installation Request',
          safeToAutomate: false,
          safetyStatusText: 'Human Approval Required: Paid software licenses require manager confirmation.',
          explanation: 'Software installation request detected. Matches catalog policy.'
        };
      } else if (lower.includes('outage') || lower.includes('infrastructure') || lower.includes('unavailable')) {
        res = {
          category: 'Cloud Infrastructure',
          priority: 'P1 Critical',
          urgency: 'Major Service Disruption',
          sopMatch: 'KB-1006: Infrastructure Outage Protocol',
          safeToAutomate: false,
          safetyStatusText: 'Human escalation required. Do not perform automatic infrastructure changes.',
          explanation: 'Critical infrastructure outage detected. Escalated for immediate human intervention.'
        };
      } else if (lower.includes('unknown')) {
          // Already handled by default 'res' object at the top
      }

      setTriageResult(res);
      setIsTriaging(false);
    }, 350);
  };

  const currentScenario = interactiveScenarios[selectedScenarioIdx];

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* ============================================================ */}
      {/* 1. HERO SECTION: NERVE CENTER & LIVE SIMULATION CONSOLE */}
      {/* ============================================================ */}
      <section className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-b from-[#090D16] via-[#0F172A] to-[#0A0F1D] text-slate-100 border border-slate-800/80 shadow-2xl">
        {/* Ambient lighting glows */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.05),_transparent_70%)] pointer-events-none"></div>

        <div className="relative z-10 px-5 sm:px-8 lg:px-12 py-10 sm:py-14 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* Left Column: Heading, Value Prop, Feature Highlights, Tech Strip, Action Buttons */}
            <div className="lg:col-span-6 space-y-5">
              
              {/* Category Tag */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-cyan-400 tracking-wide uppercase">
                  AI-Powered ITSM Automation Platform
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">
                  Interactive Simulation &amp; Demo
                </span>
              </div>

              {/* Main Heading */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-[1.12]">
                Smarter IT Support with AI Automation
              </h1>

              {/* Natural, Easy-to-Understand Description */}
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                Help employees resolve common IT problems faster with AI-powered support. Employees can report IT problems, receive troubleshooting guidance, track their tickets, and get eligible routine issues resolved automatically with safety checks.
              </p>

              {/* Compact Row of Four Professional Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs">
                  <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 flex items-center justify-center shrink-0">
                    <BrainCircuit className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-200">AI-Powered Incident Triage</span>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs">
                  <div className="w-7 h-7 rounded-lg bg-blue-950/80 border border-blue-800/60 text-blue-400 flex items-center justify-center shrink-0">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-200">Knowledge-Based RAG Assistance</span>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs">
                  <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 flex items-center justify-center shrink-0">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-200">Safe Automated Resolution</span>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs">
                  <div className="w-7 h-7 rounded-lg bg-indigo-950/80 border border-indigo-800/60 text-indigo-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-200">Human-in-the-Loop Escalation</span>
                </div>
              </div>

              {/* Theme-Consistent Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => onNavigateTab('employee-self-service')}
                  className="px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:scale-98 rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-blue-200" />
                  <span>Open Employee Portal</span>
                  <ArrowRight className="w-4 h-4 text-blue-200" />
                </button>

                <button
                  onClick={() => onNavigateTab('itsm-dashboard')}
                  className="px-4 py-3 text-sm font-semibold text-slate-200 hover:text-white bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shadow-xs"
                >
                  <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                  <span>Explore ITSM Dashboard</span>
                </button>

                <button
                  onClick={() => onNavigateTab('auto-resolution')}
                  className="px-4 py-3 text-sm font-semibold text-slate-200 hover:text-white bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shadow-xs"
                >
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span>Test Auto-Resolution</span>
                </button>

                {onOpenTechModal && (
                  <button
                    onClick={onOpenTechModal}
                    className="px-4 py-3 text-sm font-semibold text-slate-200 hover:text-white bg-slate-800/90 hover:bg-slate-700 active:scale-98 border border-slate-700 rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shadow-xs"
                  >
                    <Code2 className="w-4 h-4 text-blue-400" />
                    <span>How It Works &amp; Architecture</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: IMPROVED SIMULATION CONSOLE */}
            <div className="lg:col-span-6">
              <div className="relative rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xl">
                
                {/* Console Header with Visual Banner */}
                <div className="relative h-28 sm:h-32 overflow-hidden border-b border-slate-800">
                  <img
                    src={heroAiCanvasImg}
                    alt="AI ITSM Operations Visualizer"
                    className="w-full h-full object-cover object-center opacity-30 mix-blend-screen scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/70 to-transparent"></div>
                  
                  {/* Console Title Bar */}
                  <div className="absolute inset-x-0 top-0 px-4 py-2.5 flex items-center justify-between border-b border-white/5 bg-slate-950/70 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                      </div>
                      <span className="text-xs font-mono font-medium text-slate-300 ml-2">
                        Simulation Console
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded">
                      Sample Sandbox
                    </span>
                  </div>

                  {/* Active Scenario Title */}
                  <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        Selected IT Scenario
                      </span>
                      <h4 className="text-sm font-bold text-white">
                        {currentScenario.title}
                      </h4>
                    </div>
                    <span className="text-xs font-semibold text-slate-300 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700">
                      {currentScenario.priority}
                    </span>
                  </div>
                </div>

                {/* Scenario Selector Tabs */}
                <div className="p-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {interactiveScenarios.map((sc, idx) => (
                    <button
                      key={sc.id}
                      onClick={() => {
                        setSelectedScenarioIdx(idx);
                        setIsSimulating(false);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                        selectedScenarioIdx === idx
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      {sc.title}
                    </button>
                  ))}
                </div>

                {/* View Mode Switcher: Clear Explanation vs Technical Logs */}
                <div className="px-4 pt-3 flex items-center justify-between border-b border-slate-800/60 pb-2.5 text-xs">
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setConsoleViewMode('summary')}
                      className={`px-3 py-1 rounded-md transition-colors cursor-pointer font-medium ${
                        consoleViewMode === 'summary'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Overview &amp; Safety
                    </button>
                    <button
                      onClick={() => setConsoleViewMode('logs')}
                      className={`px-3 py-1 rounded-md transition-colors cursor-pointer font-medium flex items-center gap-1.5 ${
                        consoleViewMode === 'logs'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Terminal className="w-3 h-3" />
                      <span>System Logs</span>
                    </button>
                  </div>

                  {/* Outcome Status Badge */}
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
                      currentScenario.requiresApproval
                        ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                    }`}
                  >
                    {currentScenario.statusLabel}
                  </span>
                </div>

                {/* Main Console Content Body */}
                <div className="p-4 sm:p-5 space-y-3.5">
                  
                  {consoleViewMode === 'summary' ? (
                    /* Clear, Natural English Explanation View */
                    <div className="space-y-3 text-xs">
                      
                      {/* 1. Reported IT Problem */}
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                        <span className="text-slate-400 font-semibold block mb-1">
                          Reported IT Problem:
                        </span>
                        <p className="text-slate-200 leading-relaxed font-sans">
                          "{currentScenario.rawText}"
                        </p>
                      </div>

                      {/* 2. AI Identification & Selected Guide */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                          <span className="text-slate-400 font-semibold block">AI Issue Analysis:</span>
                          <p className="text-cyan-300 font-medium">
                            {currentScenario.aiAnalysisSummary}
                          </p>
                          <span className="text-[11px] text-slate-400 block pt-0.5">
                            Priority: <strong className="text-slate-200">{currentScenario.priority}</strong>
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                          <span className="text-slate-400 font-semibold block">Selected Troubleshooting Guide:</span>
                          <p className="text-emerald-300 font-medium">
                            {currentScenario.matchedSopTitle}
                          </p>
                          <span className="text-[11px] text-slate-400 block pt-0.5 font-mono">
                            Guide ID: {currentScenario.matchedSopCode}
                          </span>
                        </div>
                      </div>

                      {/* 3. Proposed Fix & Safety Check */}
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-semibold">Proposed Action:</span>
                          <span
                            className={`font-semibold text-[11px] flex items-center gap-1 ${
                              currentScenario.requiresApproval ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            <Shield className="w-3.5 h-3.5" />
                            {currentScenario.requiresApproval ? 'Requires Human Sign-off' : 'Automated Fix Allowed'}
                          </span>
                        </div>
                        <p className="text-slate-200 font-sans leading-relaxed">
                          {currentScenario.proposedFix}
                        </p>
                        <p className="text-[11px] text-slate-400 pt-0.5 border-t border-slate-800/60 mt-1">
                          Safety Status: <span className="text-slate-300">{currentScenario.safetyCheckText}</span>
                        </p>
                      </div>

                    </div>
                  ) : (
                    /* Detailed Technical Logs View */
                    <div className="p-3 rounded-xl bg-black/80 border border-slate-800 font-mono text-[11px] h-48 overflow-y-auto space-y-1.5">
                      {simulationLogs.map((log, i) => (
                        <div
                          key={i}
                          className={
                            log.includes('verified') || log.includes('passed')
                              ? 'text-emerald-400'
                              : log.includes('HUMAN APPROVAL')
                              ? 'text-amber-400'
                              : log.includes('AI') || log.includes('Knowledge')
                              ? 'text-cyan-300'
                              : 'text-slate-300'
                          }
                        >
                          {log}
                        </div>
                      ))}
                      {isSimulating && (
                        <div className="text-blue-400 animate-pulse flex items-center gap-2 pt-1">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Simulating safe resolution execution...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Console Action Controls - Theme Consistent */}
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
                    <button
                      onClick={handleRunSimulation}
                      disabled={isSimulating}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:scale-98 disabled:opacity-50 rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-blue-600/20"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{isSimulating ? 'Simulating Fix...' : 'Re-Run Simulation'}</span>
                    </button>

                    <button
                      onClick={() => onNavigateTab('auto-resolution')}
                      className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 cursor-pointer transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800/60"
                    >
                      <span>Open in Auto-Resolution Sandbox</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. THE 4-STAGE WORKFLOW (Clear, Intuitive, Fully Explained) */}
      {/* ============================================================ */}
      <section className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 lg:p-10 space-y-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="text-xs font-bold text-blue-600 tracking-wider uppercase mb-1">
              IT Support Workflow
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              How the Platform Resolves IT Issues
            </h2>
          </div>
          <p className="text-sm text-slate-600 max-w-md">
            From the initial employee report to automated troubleshooting or human escalation, every stage is transparent and verified.
          </p>
        </div>

        {/* 4 Interactive Stage Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {workflowStages.map((stage, idx) => {
            const IconComponent = stage.icon;
            const isSelected = activeWorkflowStep === idx;
            return (
              <div
                key={stage.step}
                onClick={() => setActiveWorkflowStep(idx)}
                className={`p-5 rounded-xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-400 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {/* Stage Number & Icon */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                    Stage {stage.step}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>
                </div>

                {/* Title & Core Description */}
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  {stage.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {stage.description}
                </p>

                {/* Inspect Link */}
                <div
                  className={`mt-4 pt-3 border-t text-[11px] flex items-center justify-between ${
                    isSelected ? 'border-blue-200 text-blue-700 font-semibold' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  <span>{isSelected ? 'Viewing Stage Details' : 'Click to inspect'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Stage Live Inspector Window */}
        <div className="rounded-xl bg-slate-900 text-slate-100 p-5 sm:p-6 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs px-2.5 py-1 rounded bg-blue-950 text-blue-400 border border-blue-800 font-semibold">
                Stage {workflowStages[activeWorkflowStep].step} Explanation
              </span>
              <h4 className="text-base font-bold text-white">
                {workflowStages[activeWorkflowStep].title}
              </h4>
            </div>
            <div className="text-xs text-slate-400">
              Channel: <span className="text-slate-200 font-medium">{workflowStages[activeWorkflowStep].channel}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            <div className="md:col-span-7 space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                {workflowStages[activeWorkflowStep].subtext}
              </p>
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                <span className="text-cyan-400 block font-semibold">Step Activity Example:</span>
                <p className="text-slate-200 font-sans">
                  {workflowStages[activeWorkflowStep].sampleInput}
                </p>
                <p className="text-slate-400 pt-1 font-sans">
                  Result: {workflowStages[activeWorkflowStep].systemAction}
                </p>
              </div>
            </div>

            <div className="md:col-span-5 bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2.5 text-xs">
              <div className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                Step-by-Step Execution Details
              </div>
              {Object.entries(workflowStages[activeWorkflowStep].executionDetails).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">{k}:</span>
                  <span className="text-cyan-300 font-semibold">{v}</span>
                </div>
              ))}
              {workflowStages[activeWorkflowStep].step !== '04' && workflowStages[activeWorkflowStep].step !== '02' && workflowStages[activeWorkflowStep].step !== '01' && (
                <div className="pt-1 text-[11px] text-slate-400">
                  Safety Verification: <span className="text-emerald-400 font-medium">Passed without risk</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </section>

      {/* ============================================================ */}
      {/* 3. CORE PLATFORM MODULES (Simplified & Distinct Purposes) */}
      {/* ============================================================ */}
      <section className="space-y-6">
        
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-bold text-blue-600 tracking-wider uppercase">
            Platform Capabilities
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            The Five Core ITSM Modules
          </h2>
          <p className="text-sm text-slate-600">
            Each module serves a distinct role in resolving IT problems, managing team queues, and maintaining safe operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coreFeatures.map((feature) => {
            const IconComp = feature.icon;
            return (
              <div
                key={feature.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between group"
              >
                <div>
                  {/* Visual Header Image if available */}
                  {feature.imageAsset ? (
                    <div className="mb-4 rounded-xl overflow-hidden h-36 border border-slate-200 relative group-hover:scale-[1.01] transition-transform">
                      <img
                        src={feature.imageAsset}
                        alt={feature.title}
                        className="w-full h-full object-cover object-center"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-white text-xs">
                        <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-white/10 font-semibold">
                          {feature.badge}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                        {feature.badge}
                      </span>
                    </div>
                  )}

                  {/* Title & Simplified Description */}
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                    {feature.description}
                  </p>

                  {/* Highlight bullets */}
                  <ul className="space-y-2 mb-6">
                    {feature.highlights.map((h, i) => (
                      <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Theme-Consistent Launch Button */}
                <button
                  onClick={() => onNavigateTab(feature.targetTab)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <span>{feature.actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

      </section>

      {/* ============================================================ */}
      {/* 4. INTERACTIVE "TEST AI TRIAGE" PLAYGROUND */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 rounded-2xl sm:rounded-3xl border border-slate-800 p-6 sm:p-8 lg:p-10 text-white shadow-xl space-y-6">
        
        <div className="max-w-2xl">
          <div className="text-xs font-bold text-cyan-400 tracking-wider uppercase mb-1">
            Interactive Triage Playground
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Test AI Issue Triage on Any IT Problem
          </h2>
          <p className="text-sm text-slate-300 mt-2">
            Type an IT problem in your own words or click a sample preset. See how the AI identifies the category, estimates urgency, and checks if an automated fix is safe.
          </p>
        </div>

        {/* Input Bar & Preset Chips */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && customPrompt && handleQuickTriage(customPrompt)}
                placeholder="Describe an IT issue, e.g. Cannot connect to company VPN when working remotely..."
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-sans"
              />
            </div>
            {/* Theme-Consistent Analyze Button */}
            <button
              onClick={() => customPrompt && handleQuickTriage(customPrompt)}
              disabled={isTriaging || !customPrompt}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-blue-600/20"
            >
              {isTriaging ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing Issue...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Problem</span>
                </>
              )}
            </button>
          </div>

          {/* Preset Buttons in Theme */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400">Click to test sample issues:</span>
            {[
              'Wi-Fi Connectivity Issue',
              'VPN Connection Issue',
              'Expired Password / Account Lockout',
              'Outlook Sync Issue',
              'Software Installation Request',
              'Critical Infrastructure Outage',
              'Unknown IT Question'
            ].map((preset) => (
              <button
                key={preset}
                onClick={() => handleQuickTriage(preset)}
                className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-medium transition-colors cursor-pointer active:scale-98"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Live Triage Results Card */}
        {triageResult && (
          <div className="p-5 rounded-2xl bg-slate-950/90 border border-blue-900/60 space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">
                  Triage Analysis Result
                </span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                {triageResult.category}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Priority Rating</span>
                <span className="text-amber-400 font-bold text-sm block mt-0.5">
                  {triageResult.priority}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Urgency Level</span>
                <span className="text-cyan-400 font-bold text-sm block mt-0.5">
                  {triageResult.urgency}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Automation Safety Check</span>
                <span className={triageResult.safeToAutomate ? 'text-emerald-400 font-bold text-sm block mt-0.5' : 'text-amber-400 font-bold text-sm block mt-0.5'}>
                  {triageResult.safeToAutomate ? 'Safe for Automated Fix' : 'Human Approval Required'}
                </span>
              </div>
            </div>

            <div className="text-xs space-y-2 text-slate-300 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 font-medium">Matched Troubleshooting Guide: </span>
                <span className="text-cyan-300 font-semibold">{triageResult.sopMatch}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Safety Assessment: </span>
                <span>{triageResult.safetyStatusText}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Why This Was Chosen: </span>
                <span>{triageResult.explanation}</span>
              </div>
            </div>

            {/* Theme-Consistent Sandbox Navigation Button */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={() => onNavigateTab('auto-resolution')}
                className="px-5 py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Test Automated Fix in Sandbox</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </section>

      {/* ============================================================ */}
      {/* 5. SAFETY GUARDRAILS & HUMAN CONTROL */}
      {/* ============================================================ */}
      <section className="bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-800 p-6 sm:p-8 lg:p-10 text-white space-y-8">
        
        <div className="max-w-2xl">
          <div className="text-xs font-bold text-cyan-400 tracking-wider uppercase mb-1">
            Safety &amp; Governance
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Built with Safety Checks &amp; Human Control
          </h2>
          <p className="text-sm text-slate-300 mt-2">
            AI automation should never compromise security. The platform verifies strict safety checks before any action executes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">Safety Checks Before Actions</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every automated fix must pass strict safety rules. If an action could affect other users or production servers, it stops immediately.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <UserCheck className="w-5 h-5 text-blue-400" />
            <h4 className="text-sm font-bold text-white">Human Approval When Needed</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sensitive operations (like password resets, paid licenses, and database restarts) always require an authorized person to confirm before proceeding.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm font-bold text-white">Grounded in Verified Guides</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI recommendations come directly from approved company standard operating procedures (SOPs), preventing hallucinations or random guesses.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <h4 className="text-sm font-bold text-white">Complete Audit History</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every ticket triage decision, status change, and simulated fix is timestamped and saved in an audit log for full accountability.
            </p>
          </div>
        </div>

        {/* Footer Navigation CTA - Theme-Consistent Buttons */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            <span>AI-Powered ITSM Automation Platform</span>
            <span className="mx-2">·</span>
            <span>Ready to explore any module in the simulation sandbox</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {onOpenTechModal && (
              <button
                onClick={onOpenTechModal}
                className="px-4 py-2.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 active:scale-98 rounded-xl border border-slate-700 cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Code2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Architecture</span>
              </button>
            )}
            <button
              onClick={() => onNavigateTab('employee-self-service')}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:scale-98 rounded-xl shadow-md shadow-blue-600/20 cursor-pointer transition-colors"
            >
              Open Employee Portal
            </button>
            <button
              onClick={() => onNavigateTab('itsm-dashboard')}
              className="px-4 py-2.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 active:scale-98 rounded-xl border border-slate-700 cursor-pointer transition-colors shadow-xs"
            >
              Explore ITSM Dashboard
            </button>
          </div>
        </div>

      </section>
    </div>
  );
}
