export const SAMPLE_KNOWLEDGE_ARTICLES = [
  {
    id: 'KB-1001',
    title: 'VPN Connection Troubleshooting',
    category: 'Network & VPN',
    shortDescription: 'Fixes for VPN connection drops from home.',
    troubleshootingInstructions: ['Reset adapter', 'Push MTU 1360'],
    tags: ['vpn', 'connection'],
    lastUpdated: '2024-10-10',
    sourceDocument: 'SOP-NET-014-VPN-Client-Resolution.md',
    ragMetadata: {
        chunks: [{ chunkId: 'KB-1001-C1', heading: 'Overview', text: 'VPN connectivity guide.' }]
    }
  },
  {
    id: 'KB-1004',
    title: 'Wi-Fi Connectivity Problems',
    category: 'Network & Connectivity',
    shortDescription: 'Troubleshooting enterprise Wi-Fi issues.',
    troubleshootingInstructions: ['Forget network', 'Re-authenticate'],
    tags: ['wifi', 'network'],
    lastUpdated: '2024-10-10',
    sourceDocument: 'SOP-NET-008-Enterprise-WiFi-Diagnostics.md',
    ragMetadata: {
        chunks: [{ chunkId: 'KB-1004-C1', heading: 'Wi-Fi', text: 'Wi-Fi connectivity guide.' }]
    }
  },
  {
    id: 'KB-1003',
    title: 'Outlook Synchronization Issues',
    category: 'Email & O365',
    shortDescription: 'Quick fixes for Outlook sync freezes.',
    troubleshootingInstructions: ['Rebuild local cache'],
    tags: ['outlook', 'email'],
    lastUpdated: '2024-10-10',
    sourceDocument: 'SOP-M365-021-Outlook-Sync-Remediation.md',
    ragMetadata: {
        chunks: [{ chunkId: 'KB-1003-C1', heading: 'Outlook', text: 'Outlook sync guide.' }]
    }
  },
  {
    id: 'KB-1002',
    title: 'Password Reset and Account Unlock',
    category: 'Identity & Access',
    shortDescription: 'Self-service password reset and account unlock.',
    troubleshootingInstructions: ['Biometric re-verification'],
    tags: ['password', 'account'],
    lastUpdated: '2024-10-10',
    sourceDocument: 'SOP-SEC-002-Password-Recovery-Standard.md',
    ragMetadata: {
        chunks: [{ chunkId: 'KB-1002-C1', heading: 'Password', text: 'Password reset guide.' }]
    }
  },
  {
    id: 'KB-1005',
    title: 'Software Installation Request',
    category: 'Software & Licensing',
    shortDescription: 'How to request software like VS Code.',
    troubleshootingInstructions: ['Submit Service Request'],
    tags: ['software', 'installation'],
    lastUpdated: '2024-10-10',
    sourceDocument: 'SOP-APP-001.md',
    ragMetadata: {
        chunks: [{ chunkId: 'KB-1005-C1', heading: 'Software', text: 'Software request guide.' }]
    }
  },
  {
    id: 'KB-1006',
    title: 'Infrastructure Outage Protocol',
    category: 'Cloud Infrastructure',
    shortDescription: 'Steps for critical infrastructure outage.',
    troubleshootingInstructions: ['Page SRE immediately'],
    tags: ['outage', 'critical'],
    lastUpdated: '2024-10-10',
    sourceDocument: 'SOP-SRE-009.md',
    ragMetadata: {
        chunks: [{ chunkId: 'KB-1006-C1', heading: 'Outage', text: 'Critical outage guide.' }]
    }
  }
];
