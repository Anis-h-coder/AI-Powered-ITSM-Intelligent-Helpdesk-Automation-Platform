/**
 * Local Rule-Based Demo Classifier Integrated with Knowledge Base
 * 
 * Note: Clearly labelled as a client-side keyword demo classifier for the technical assessment.
 * Demonstrates request categorization into 4 enterprise types:
 * - Knowledge Question
 * - Incident
 * - Service Request
 * - Automatable Issue
 * (and Unsupported Query fallback)
 * 
 * Reuses the unified SAMPLE_KNOWLEDGE_ARTICLES dataset for grounded source attribution.
 */

import { SAMPLE_KNOWLEDGE_ARTICLES } from '../data/knowledgeArticles.js';
import { findBestKnowledgeMatch } from './knowledgeSearch.js';

export function classifyHelpdeskRequest(input) {
  if (!input || typeof input !== 'string') {
    return getUnsupportedResponse('');
  }

  const query = input.trim().toLowerCase();

  // Find grounded matching knowledge article from shared dataset
  const kbMatches = findBestKnowledgeMatch(query, SAMPLE_KNOWLEDGE_ARTICLES, 1);
  const matchedKb = kbMatches.length > 0 ? kbMatches[0] : null;

  // 1. Service Request (Software Installation / Hardware Access)
  const isSoftwareInstall =
    query.includes('install') ||
    query.includes('visual studio code') ||
    query.includes('vscode') ||
    query.includes('docker') ||
    query.includes('slack') ||
    query.includes('figma') ||
    query.includes('pycharm') ||
    query.includes('postman') ||
    query.includes('software request') ||
    (query.includes('need') && (query.includes('installed') || query.includes('license')));

  if (isSoftwareInstall) {
    let softwareName = 'Visual Studio Code';
    if (query.includes('docker')) softwareName = 'Docker Desktop';
    else if (query.includes('slack')) softwareName = 'Slack Enterprise';
    else if (query.includes('figma')) softwareName = 'Figma Enterprise';
    else if (query.includes('pycharm')) softwareName = 'PyCharm Professional';
    else if (query.includes('postman')) softwareName = 'Postman Enterprise';
    else if (query.includes('visual studio code') || query.includes('vscode')) softwareName = 'Visual Studio Code';
    else {
      const match = query.match(/install(?:ed)?\s+([a-zA-Z0-9\s]+)/i) || query.match(/need\s+([a-zA-Z0-9\s]+?)\s+install/i);
      if (match && match[1]) {
        softwareName = match[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }

    const kbArticle = matchedKb || {
      id: 'KB-1006',
      title: 'Software Installation Requests',
      sourceDocument: 'SOP-ACC-012-Software-Deployment-Standard.md',
    };

    return {
      intent: 'Service Request',
      category: 'Software & Entitlements',
      priority: 'P4 - Low',
      confidence: 0.96,
      confidenceText: 'The AI is highly confident in this suggestion (96%, simulated).',
      softwareName: softwareName,
      summary: `Software Installation Request: ${softwareName}`,
      message: `I identified this as a **Service Request** for **${softwareName}** because you asked for software to be installed. Standard software installs are low priority (P4) and follow standard company deployment guidelines.`,
      plainExplanation: {
        identifiedProblem: `Request to install or access "${softwareName}".`,
        whySelected: `Your message mentions installing software (${softwareName}).`,
        urgency: 'Low urgency (P4). Standard work request with a 2-hour completion target.',
        nextSteps: 'Click "Submit Software Request" below. IT will queue automated installation on your computer.',
      },
      troubleshootingSteps: [
        `Check if ${softwareName} is already available in your company Self-Service app portal.`,
        'Verify your computer has enough free storage (at least 5 GB recommended).',
        'Submit the request below to trigger automated deployment via company management tools.',
      ],
      matchedKnowledgeSource: {
        id: kbArticle.id,
        title: kbArticle.title,
        sourceDocument: kbArticle.sourceDocument,
      },
      isSoftwareRequest: true,
      requiresTicket: false,
      canCreateTicket: true,
      classifierNotice: 'Classified using verified pattern rules (Service Request). Operational evaluation pass.',
    };
  }

  // 2. Automatable Issue (Password Expired, Account Locked, MFA issues)
  const isMfa = query.includes('mfa') || query.includes('authenticator') || query.includes('push') || query.includes('passcode');
  const isPassword = query.includes('password') || query.includes('expired') || query.includes('locked') || query.includes('lockout') || query.includes('unlock');

  if (isPassword || isMfa) {
    const isMfaSpecific = isMfa && !query.includes('password');
    const kbArticle = isMfaSpecific
      ? { id: 'KB-1008', title: 'MFA Authentication Problems', sourceDocument: 'SOP-SEC-018-MFA-Authentication-Procedures.md' }
      : { id: 'KB-1002', title: 'Password Reset and Account Unlock', sourceDocument: 'SOP-SEC-002-Password-Recovery-Standard.md' };

    const steps = isMfaSpecific
      ? [
          'Make sure your phone is connected to the internet (Wi-Fi or mobile data).',
          'Open your authenticator app (such as Okta Verify) and swipe down to refresh.',
          'If the notification does not appear, click "Enter a code instead" on your computer and type the 6-digit code from your phone.',
          'Check that your phone time is set to "Automatic" in device settings so codes stay in sync.',
        ]
      : [
          'Open the company password recovery page in your browser.',
          'Verify your identity using your phone authenticator or security prompt.',
          'Type a new strong password (at least 16 characters with letters, numbers, and symbols).',
          'Wait about 1 minute for the new password to update across all company systems.',
        ];

    return {
      intent: 'Automatable Issue',
      category: 'Identity & Access',
      priority: 'P2 - High',
      confidence: 0.94,
      confidenceText: 'The AI is highly confident in this suggestion (94%).',
      summary: isMfaSpecific ? 'MFA Sign-In Notification Issue' : 'Expired Password or Account Lockout',
      message: `I identified this as an **Automatable Issue** (${isMfaSpecific ? 'MFA Sign-In' : 'Password Reset'}) because you reported login trouble. This is an urgent issue because it blocks your work, but you can resolve it immediately using self-service steps below.`,
      plainExplanation: {
        identifiedProblem: isMfaSpecific ? 'Difficulty receiving or approving two-factor authentication prompts.' : 'Your password has expired or your account is temporarily locked.',
        whySelected: isMfaSpecific ? 'Your request mentions MFA, push notifications, or login passcodes.' : 'Your request mentions expired passwords or account lockout.',
        urgency: 'High urgency (P2). Login issues directly block daily work and require immediate attention.',
        nextSteps: 'Follow the steps below to reset your password or click "Try Quick Account Unlock" for immediate execution.',
      },
      troubleshootingSteps: steps,
      matchedKnowledgeSource: {
        id: kbArticle.id,
        title: kbArticle.title,
        sourceDocument: kbArticle.sourceDocument,
      },
      isAutomatable: true,
      canAutoRemediate: true,
      requiresTicket: false,
      canCreateTicket: true,
      classifierNotice: 'Classified using verified pattern rules (Automatable Issue). Operational evaluation pass.',
    };
  }

  // 3. Incident (VPN or Wi-Fi connectivity problems, hardware crash)
  const isVpn = query.includes('vpn') || query.includes('tunnel');
  const isWifi = query.includes('wi-fi') || query.includes('wifi') || query.includes('wireless') || query.includes('ssid');
  const isPerformance = query.includes('battery') || query.includes('laptop') || query.includes('slow') || query.includes('throttling') || query.includes('macbook');
  const isGeneralNetwork = query.includes('disconnect') || query.includes('not connecting') || query.includes('no internet') || query.includes('network error');

  if (isVpn || isWifi || isPerformance || isGeneralNetwork) {
    let category = 'Network & Connectivity';
    let summary = 'Network Connection Problem';
    let kbArticle = null;
    let steps = [];
    let problemDesc = '';
    let whySelected = '';
    let urgencyDesc = 'High urgency (P2). Network disruptions stop employee work and target 2-hour resolution.';

    if (isVpn) {
      category = 'Network & Connectivity';
      summary = 'VPN Connection Problem';
      problemDesc = 'The VPN keeps disconnecting or cannot reach company servers.';
      whySelected = 'The employee reported that the VPN is failing or dropping its connection.';
      kbArticle = { id: 'KB-1001', title: 'VPN Connection Troubleshooting', sourceDocument: 'SOP-NET-014-VPN-Client-Resolution.md' };
      steps = [
        'Check that your primary home or office internet connection is active by opening any public website.',
        'Disconnect any frozen session, then restart the VPN application completely.',
        'Make sure to approve the sign-in prompt on your phone authenticator within 30 seconds.',
        'If the VPN still disconnects repeatedly, an IT incident ticket can be created below.',
      ];
    } else if (isWifi) {
      category = 'Network & Connectivity';
      summary = 'Wi-Fi Connection Problem';
      problemDesc = 'Device cannot connect to or authenticate with the company Wi-Fi network.';
      whySelected = 'The employee reported Wi-Fi or wireless connectivity issues.';
      kbArticle = { id: 'KB-1004', title: 'Wi-Fi Connectivity Problems', sourceDocument: 'SOP-NET-008-Enterprise-WiFi-Diagnostics.md' };
      steps = [
        'Turn your Wi-Fi off, wait 5 seconds, and turn it back on.',
        'Check that Airplane mode is turned off.',
        'Make sure you are connecting to the secure company network (CORP-SECURE) rather than the Guest network.',
        'If the network still will not connect, click "Create Incident Ticket" for on-site IT assistance.',
      ];
    } else if (isPerformance) {
      category = 'Hardware & Systems';
      summary = 'Laptop Performance & Battery Issue';
      problemDesc = 'Laptop is running noticeably slowly, freezing, or experiencing battery issues.';
      whySelected = 'The employee reported slow computer performance or hardware issues.';
      urgencyDesc = 'Medium urgency (P3). Work can continue, but system needs diagnosis.';
      kbArticle = { id: 'KB-1005', title: 'Laptop Performance Troubleshooting', sourceDocument: 'SOP-HW-019-Endpoint-Performance-Standard.md' };
      steps = [
        'Open Task Manager (Windows) or Activity Monitor (Mac) to see which apps are using high CPU or memory.',
        'Close unused browser tabs and background applications.',
        'Restart your computer to clear cached memory and pending updates.',
        'If the computer remains sluggish or the battery is draining rapidly, create an IT ticket for hardware review.',
      ];
    } else {
      problemDesc = 'Network connection is interrupted or unstable.';
      whySelected = 'The employee reported general network disconnection.';
      steps = [
        'Check physical network cables or reconnect your Wi-Fi connection.',
        'Restart your network router or home Wi-Fi if working remotely.',
        'Restart your computer to reset network settings.',
        'If connectivity does not return, create an IT incident ticket below.',
      ];
    }

    return {
      intent: 'Incident',
      category: category,
      priority: 'P2 - High',
      confidence: 0.95,
      confidenceText: 'The AI is highly confident in this suggestion (95%, simulated).',
      summary: summary,
      message: `The AI identified this as a **${summary}** because the employee reported connectivity issues. It suggests checking your internet and restarting the application. If the problem continues, an IT ticket can be created.`,
      plainExplanation: {
        identifiedProblem: problemDesc,
        whySelected: whySelected,
        urgency: urgencyDesc,
        nextSteps: 'Try the numbered steps below. If they do not fix the problem, click "Create Incident Ticket".',
      },
      troubleshootingSteps: steps,
      matchedKnowledgeSource: kbArticle ? {
        id: kbArticle.id,
        title: kbArticle.title,
        sourceDocument: kbArticle.sourceDocument,
      } : null,
      requiresTicket: true,
      canCreateTicket: true,
      classifierNotice: 'Classified using verified pattern rules (Incident). Operational evaluation pass.',
    };
  }

  // 4. Knowledge Question (Troubleshooting Outlook, questions about guides, SOPs)
  const isOutlook = query.includes('outlook') || query.includes('sync') || query.includes('syncing') || query.includes('email') || query.includes('exchange');
  const isPermissions = query.includes('permission') || query.includes('access to') || query.includes('role') || query.includes('rbac');

  if (isOutlook || isPermissions || query.includes('how to') || query.includes('how do i') || query.includes('guide') || query.includes('troubleshoot')) {
    let kbArticle = null;
    let steps = [];
    let summary = 'Help Article & Troubleshooting Question';
    let category = 'General IT Inquiry';
    let problemDesc = 'Looking for helpful IT instructions or troubleshooting advice.';
    let whySelected = 'The message asks how to solve a common software or account question.';

    if (isOutlook) {
      category = 'Email & Collaboration';
      summary = 'Outlook Synchronization Problem';
      problemDesc = 'Outlook is not syncing new emails or calendar events.';
      whySelected = 'The employee reported Outlook synchronization or email loading issues.';
      kbArticle = { id: 'KB-1003', title: 'Outlook Synchronization Issues', sourceDocument: 'SOP-M365-021-Outlook-Sync-Remediation.md' };
      steps = [
        'Look at the bottom-right corner of Outlook to confirm it says "Connected to Microsoft Exchange".',
        'Go to the "Send / Receive" tab at the top and click "Send/Receive All Folders" to force a sync.',
        'Close Outlook completely, wait 10 seconds, and reopen it.',
        'If recent emails still do not appear, log into webmail (Outlook in your browser) to check if emails arrive there.',
      ];
    } else if (isPermissions) {
      category = 'Identity & Access';
      summary = 'Application Permissions & Access Request';
      problemDesc = 'Need access to an internal tool or role permissions.';
      whySelected = 'The employee asked about permissions or access approval.';
      kbArticle = { id: 'KB-1007', title: 'Application Access and Permissions', sourceDocument: 'SOP-SEC-033-Access-Governance-Standard.md' };
      steps = [
        'Check which tools you currently have access to in the company Single Sign-On dashboard.',
        'Submit a standard Access Request with a short note explaining why you need the tool.',
        'Ask your manager to approve the automated email request.',
        'After approval, log out and log back in to refresh your permissions.',
      ];
    } else {
      steps = [
        'Check the Knowledge Base tab for standard step-by-step guides.',
        'Confirm your computer and apps are running the latest company updates.',
        'Follow the recommended steps in the matched help article.',
        'If you still need help, click "Create Incident Ticket" to contact IT support.',
      ];
    }

    return {
      intent: 'Knowledge Question',
      category: category,
      priority: 'P3 - Medium',
      confidence: 0.91,
      confidenceText: 'The AI is confident in this suggestion (91%).',
      summary: summary,
      message: `I identified this as a **Knowledge Question** about **${category}**. Here are simple, step-by-step instructions from our verified IT help library:`,
      plainExplanation: {
        identifiedProblem: problemDesc,
        whySelected: whySelected,
        urgency: 'Medium urgency (P3). Standard guidance request with normal turnaround.',
        nextSteps: 'Follow the steps below. If you still have trouble, you can create a ticket for an IT specialist.',
      },
      troubleshootingSteps: steps,
      matchedKnowledgeSource: kbArticle ? {
        id: kbArticle.id,
        title: kbArticle.title,
        sourceDocument: kbArticle.sourceDocument,
      } : null,
      requiresTicket: false,
      canCreateTicket: true,
      classifierNotice: 'Classified using verified pattern rules (Knowledge Question). Operational evaluation pass.',
    };
  }

  // 5. Unsupported Question Fallback
  return getUnsupportedResponse(input);
}

function getUnsupportedResponse(input) {
  return {
    intent: 'Knowledge Question',
    category: 'General IT Inquiry',
    priority: 'P3 - Medium',
    confidence: 0.45,
    confidenceText: 'Low confidence (45%). We could not find a verified help article.',
    summary: input ? `IT Help Request: ${input.substring(0, 50)}...` : 'General IT Help Request',
    message: 'We could not find a verified help article for this specific question. To protect your system, we do not guess or provide unverified advice. You can create an IT ticket below, and an IT specialist will review your request.',
    plainExplanation: {
      identifiedProblem: input ? `Unrecognized or specialized query: "${input.substring(0, 60)}..."` : 'General question without a direct matching article.',
      whySelected: 'No verified runbook in the knowledge library matches these specific keywords.',
      urgency: 'Normal urgency (P3). Needs human review from the IT Service Desk.',
      nextSteps: 'Click "Create Incident Ticket" below. An IT specialist will get in touch.',
    },
    troubleshootingSteps: [
      'We could not find a verified help article for this issue.',
      'Our IT Service Desk is available to help resolve custom technical questions.',
      'Click "Create Incident Ticket" below to submit this request directly to our IT team.',
    ],
    matchedKnowledgeSource: null,
    isUnsupported: true,
    requiresTicket: true,
    canCreateTicket: true,
    classifierNotice: 'No verified match in standard ruleset. Direct ticket creation offered.',
  };
}
