export const INITIAL_TICKETS = [
  {
    id: 'INC-2024-001',
    title: 'VPN Connection drops from home',
    description: 'GlobalProtect VPN tunnel drops constantly when connecting from my home network.',
    requester: 'David Zhao',
    requesterEmail: 'david.zhao@enterprise.internal',
    department: 'Engineering',
    category: 'Network & VPN',
    priority: 'P2 - High',
    status: 'Open',
    createdAt: '2024-10-11 10:00',
    aiTriage: {
      predictedCategory: 'Network & VPN',
      confidence: 0.96,
      recommendedRunbook: 'RB-NET-042: GlobalProtect Tunnel MTU Adjustment',
      suggestedAction: 'Reset adapter and push MTU 1360',
    },
  },
  {
    id: 'INC-2024-002',
    title: 'Cannot connect to corporate Wi-Fi',
    description: 'My laptop cannot connect to the enterprise Wi-Fi network.',
    requester: 'David Zhao',
    requesterEmail: 'david.zhao@enterprise.internal',
    department: 'Engineering',
    category: 'Network & Connectivity',
    priority: 'P3 - Medium',
    status: 'Open',
    createdAt: '2024-10-11 10:05',
    aiTriage: {
      predictedCategory: 'Network & Connectivity',
      confidence: 0.85,
      recommendedRunbook: 'RB-NET-001: Wi-Fi Re-authentication',
      suggestedAction: 'Forget network and re-enter credentials',
    },
  },
  {
    id: 'INC-2024-003',
    title: 'Outlook Synchronization Issues',
    description: 'Outlook displays error 0x80040115 and is not syncing shared mailboxes.',
    requester: 'Brian Hughes',
    requesterEmail: 'brian.hughes@enterprise.internal',
    department: 'Finance',
    category: 'Email & O365',
    priority: 'P3 - Medium',
    status: 'Open',
    createdAt: '2024-10-11 10:10',
    aiTriage: {
      predictedCategory: 'Email & O365',
      confidence: 0.93,
      recommendedRunbook: 'RB-M365-031: OST Rebuild',
      suggestedAction: 'Rebuild local cache',
    },
  },
  {
    id: 'INC-2024-004',
    title: 'Password and Account Lockout',
    description: 'My password expired and my account is locked out.',
    requester: 'Rachel Simmons',
    requesterEmail: 'rachel.simmons@enterprise.internal',
    department: 'HR',
    category: 'Identity & Access',
    priority: 'P2 - High',
    status: 'Open',
    createdAt: '2024-10-11 10:15',
    aiTriage: {
      predictedCategory: 'Identity & Access',
      confidence: 0.95,
      recommendedRunbook: 'RB-IAM-012: MFA Reset',
      suggestedAction: 'Biometric re-verification',
    },
  },
  {
    id: 'INC-2024-006',
    title: 'Critical Infrastructure Outage',
    description: 'The production database server is down and all services are failing.',
    requester: 'Elena Rostova',
    requesterEmail: 'elena.rostova@enterprise.internal',
    department: 'Cloud Ops',
    category: 'Cloud Infrastructure',
    priority: 'P1 - Critical',
    status: 'Escalated',
    createdAt: '2024-10-11 10:20',
    aiTriage: {
      predictedCategory: 'Cloud Infrastructure',
      confidence: 0.99,
      recommendedRunbook: 'RB-SRE-009: Outage Protocol',
      suggestedAction: 'Page SRE',
    },
  },
];

export const INITIAL_SOFTWARE_REQUESTS = [
  {
    id: 'REQ001',
    requestedSoftware: 'Visual Studio Code',
    status: 'Submitted',
    requester: 'Kevin Patel',
    department: 'Engineering',
    submittedAt: '2024-10-11 10:25',
  },
];

export const INITIAL_AUDIT_LOGS = [
  {
    id: 'LOG-001',
    automatedAction: 'Triage for INC-2024-001',
    relatedItem: 'INC-2024-001',
    executionStatus: 'Success',
    timestamp: '2024-10-11 10:00',
    result: 'Classified P2',
    isSimulated: true,
  },
];

export const SERVICE_CATALOG = [
  {
    id: 'CAT-01',
    title: 'Developer Software & Cloud Access',
    category: 'Software Access',
    description: 'Request automated access to GitHub Enterprise, AWS Staging IAM roles, Datadog, or Figma Enterprise.',
    deliveryTime: '< 2 hours (Automated Approval)',
    icon: 'Key',
    badge: 'Fast-Track',
  },
  {
    id: 'CAT-02',
    title: 'Hardware & Peripheral Replacement',
    category: 'Hardware',
    description: 'Order standard IT equipment including replacement USB-C hubs, 4K monitors, YubiKey 5C NFC, or headsets.',
    deliveryTime: '1 - 2 Business Days',
    icon: 'Laptop',
    badge: 'Depot Stocked',
  },
  {
    id: 'CAT-03',
    title: 'Zero-Trust VPN & Network Profile',
    category: 'Network & VPN',
    description: 'Request network profile configuration, VPN client renewal, or access to restricted subnet segments.',
    deliveryTime: 'Immediate Self-Service',
    icon: 'ShieldCheck',
    badge: 'Self-Serve',
  },
  {
    id: 'CAT-04',
    title: 'MFA Token & Credential Reset',
    category: 'Identity & SSO',
    description: 'Report lost authentication device, reset Okta Verify enrollments, or generate emergency bypass credentials.',
    deliveryTime: '15 Minutes',
    icon: 'Lock',
    badge: 'Security Verified',
  },
];

export const AI_INCIDENT_CLUSTERS = [
  {
    id: 'CLUSTER-804',
    title: 'Okta Verify MFA Push Timeout Flurry',
    affectedUsers: 42,
    firstDetected: '28 minutes ago',
    severity: 'High Impact',
    rootCauseHypothesis: 'Regional Apple APNs gateway latency causing iOS push delivery timeout before Okta 30s expiry.',
    confidenceScore: 0.94,
    recommendedRemediation: 'Temporarily instruct employees to use 6-digit OTP codes in Okta Verify app rather than push notification.',
    status: 'Active Anomaly',
  },
  {
    id: 'CLUSTER-803',
    title: 'Outlook Desktop Shared Mailbox Search Crash (0x80040115)',
    affectedUsers: 19,
    firstDetected: '3 hours ago',
    severity: 'Medium Impact',
    rootCauseHypothesis: 'Corrupted Windows Search index key following Microsoft 365 cumulative update 2409.',
    confidenceScore: 0.91,
    recommendedRemediation: 'Deploy Intune remediation script to rebuild local search catalog on affected endpoints.',
    status: 'Mitigation in Progress',
  },
  {
    id: 'CLUSTER-802',
    title: 'Frankfurt DC (EU-Central-1) VPN Tunnel Packet Drops',
    affectedUsers: 14,
    firstDetected: '5 hours ago',
    severity: 'Low Impact',
    rootCauseHypothesis: 'ISP upstream routing flapping between Cogent and Telia transit links in Frankfurt IX.',
    confidenceScore: 0.88,
    recommendedRemediation: 'Force BGP failover priority to secondary Deutsche Telekom transit link.',
    status: 'Monitored',
  },
];

import { SAMPLE_KNOWLEDGE_ARTICLES } from './knowledgeArticles.js';

export const KNOWLEDGE_ARTICLES = SAMPLE_KNOWLEDGE_ARTICLES;

export const TRIAGE_SIMULATION_PRESETS = [
  {
    label: 'Wi-Fi Connectivity Issue',
    text: 'Employee cannot connect to the office Wi-Fi network.',
  },
  {
    label: 'VPN Connection Issue',
    text: 'Employee cannot connect to the company VPN while working from home.',
  },
  {
    label: 'Expired Password / Account Lockout',
    text: 'Employee cannot sign in because the password has expired or the account is locked.',
  },
  {
    label: 'Outlook Sync Issue',
    text: 'Outlook is not syncing new emails.',
  },
  {
    label: 'Software Installation Request',
    text: 'Employee requests installation of software on their laptop.',
  },
  {
    label: 'Critical Infrastructure Outage',
    text: 'A critical company IT service or infrastructure component is unavailable.',
  },
  {
    label: 'Unknown IT Question',
    text: 'An employee asks an IT question that cannot be answered using the available knowledge base.',
  },
];
