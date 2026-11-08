import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Trash2,
  Sparkles,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  KeyRound,
  FileText,
  Clock,
  Laptop,
  Layers,
  Info,
  Check,
  BookOpen
} from 'lucide-react';
import { PriorityBadge, CategoryBadge } from '../common/Badge.jsx';
import { Modal } from '../common/Modal.jsx';

export const SUGGESTED_QUESTIONS = [
  'My VPN is not connecting.',
  'My password has expired.',
  'Outlook is not syncing.',
  'My Wi-Fi is not working.',
  'I need Visual Studio Code installed.',
];

// Helper to format current time
const getCurrentTimeString = () => {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatKnowledgeAnswer = (text) => {
  if (!text) return null;

  const cleanedText = text
    .replace(/^Based on the approved knowledge article\(s\):\s*/i, '')
    .replace(/^•\s*/, '')
    .trim();

  const colonIndex = cleanedText.indexOf(':');
  const title = colonIndex === -1
    ? 'Troubleshooting Guidance'
    : cleanedText.slice(0, colonIndex).trim();
  const content = colonIndex === -1
    ? cleanedText
    : cleanedText.slice(colonIndex + 1).trim();

  // Split the KB article into separate readable instructions instead of one paragraph.
  const sentences = content
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (
    sentences.length &&
    sentences[0].replace(/[.!?]$/, '').toLowerCase() === title.toLowerCase()
  ) {
    sentences.shift();
  }

  const warningPattern = /\b(do not|don't|never|avoid|must not|bypass|disable)\b/i;
  const escalationPattern = /\b(escalate|contact|raise a ticket|reach out|on-call|support team)\b/i;

  const warning = sentences.filter((sentence) => warningPattern.test(sentence));
  const escalation = sentences.filter((sentence) => escalationPattern.test(sentence));
  const steps = sentences.filter(
    (sentence) => !warningPattern.test(sentence) && !escalationPattern.test(sentence)
  );

  return {
    title,
    steps,
    warning,
    escalation,
    fallbackContent: content,
  };
};

export function HelpdeskChatbot({
  tickets,
  softwareRequests = [],
  onAddTicket,
  onAddSoftwareRequest,
  onOpenTicketModal
}) {
  const [messages, setMessages] = useState([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: 'Hello! How can I help you with your IT issues today?',
      timestamp: getCurrentTimeString(),
      classification: null,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [ticketModalData, setTicketModalData] = useState(null);
  const [createdReferences, setCreatedReferences] = useState({}); // maps messageId -> { refId, type }
  const [automatedResetSuccess, setAutomatedResetSuccess] = useState({}); // maps messageId -> boolean
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [ticketCreationError, setTicketCreationError] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Handle submitting query to FastAPI
  const handleSendMessage = async (
    textToSend = inputValue,
    clarificationAnswer = null
  ) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isTyping) return;

    const userMessageId = `user-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        sender: 'user',
        text: trimmed,
        timestamp: getCurrentTimeString(),
      },
    ]);

    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          clarificationAnswer
            ? {
                text: clarificationAnswer.originalIssue,
                department: 'IT',
                original_issue: clarificationAnswer.originalIssue,
                clarification_answers: {
                  [clarificationAnswer.key]: clarificationAnswer.value,
                },
              }
            : {
                text: trimmed,
                department: 'IT',
              }
        ),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Triage request failed (${response.status})`
        );
      }

      const data = await response.json();

      // Handle backend clarification request
      if (data.needsClarification) {
        const clarificationMessage = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          text: data.clarificationQuestion,
          timestamp: getCurrentTimeString(),
          clarification: {
            originalIssue: data.original_issue || trimmed,
            key: data.clarification_key || 'affected_users',
            options: data.clarificationOptions || [],
          },
        };

        setMessages((prev) => [...prev, clarificationMessage]);
        return;
      }

      // Convert backend response to the format used by this chatbot.
      const confidenceValue =
        data.confidenceScore ?? data.confidence;

      const confidence =
        confidenceValue !== null &&
        confidenceValue !== undefined &&
        Number.isFinite(Number(confidenceValue))
          ? Number(confidenceValue)
          : null;

      const originalIssueText = clarificationAnswer?.originalIssue || trimmed;

      const classification = {
        intent: data.intent || 'Incident',
        category: data.predictedCategory || 'General IT Inquiry',
        priority: data.suggestedPriority || 'Needs Assessment',
        confidence,
        confidenceText: data.modelScores
          ? 'Individual AI model scores (not verified accuracy)'
          : confidence !== null
            ? `Legacy combined model score: ${confidence.toFixed(1)}/100 (not verified accuracy)`
            : 'Model score unavailable',
        modelScores: data.modelScores || null,
        summary: data.intent === 'Incident'
          ? `IT Incident: ${originalIssueText}`
          : data.intent === 'Service Request'
            ? `Software Request: ${originalIssueText}`
            : `${data.intent || 'IT Support'}: ${originalIssueText}`,
        message:
          data.answer ||
          'Your issue has been analyzed. Please review the classification below.',
        plainExplanation: {
          identifiedProblem: clarificationAnswer?.originalIssue || trimmed,
          categoryReason:
            data.categoryReason ||
            data.selectionReason ||
            `The reported symptoms were matched to the ${data.predictedCategory || 'General IT Inquiry'} category by the triage classifier.`,
          impact: data.impact || 'Needs Assessment',
          impactReason:
            data.impactReasoning ||
            (data.impact
              ? `Business impact was assessed as ${data.impact} using the reported scope of affected users and available triage rules.`
              : 'Business impact has not been confirmed.'),
          urgency: data.urgency || 'Needs Assessment',
          urgencyReason:
            data.urgencyReasoning ||
            'Urgency is based on the reported symptoms and the triage model/business rules.',
          priority: data.suggestedPriority || 'Needs Assessment',
          priorityReason:
            data.priorityReasoning ||
            'Priority is assigned using the configured impact and urgency matrix.',
          nextSteps:
            data.intent === 'Incident Update'
              ? 'Update the existing incident to Resolved, or contact the service desk with its incident ID. Do not create a duplicate ticket.'
              : data.intent === 'Knowledge Question'
                ? 'Review the approved knowledge article steps. No incident ticket is needed for a knowledge question.'
                : data.intent === 'Service Request'
                  ? 'Submit this through the Software Request workflow. It is not an incident ticket.'
                  : data.intent === 'Out of Domain'
                    ? 'This request is outside the IT helpdesk scope. No IT ticket should be created.'
                    : data.intent === 'Incident' && data.escalated
                      ? 'This incident needs human IT review. Use Create Incident Ticket below to submit it.'
                      : data.intent === 'Incident'
                        ? 'Review the suggested classification and submit an incident ticket if the issue is still unresolved.'
                        : 'Review the guidance above. If the issue remains unclear, contact the IT service desk.',
        },
        matchedKnowledgeSource: data.sources?.[0]
          ? {
              id: data.sources[0].article_id,
              title: data.sources[0].title,
            }
          : null,
        canCreateTicket:
          data.canCreateTicket === true && data.intent === 'Incident',
        canUpdateIncident: data.intent === 'Incident Update' || Boolean(data.canUpdateIncident),
        requiresTicket: data.intent === 'Incident' && data.canCreateTicket === true,
        isSoftwareRequest: data.intent === 'Service Request',
        softwareName: data.softwareName || 'Software Application',
        isAutomatable: data.intent === 'Automatable Issue',
        escalated: Boolean(data.escalated),
        recommendedGroup: data.recommendedGroup,
        classifierNotice:
          data.triageMethod || 'Classification provided by backend triage.',
      };

      const assistantMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: classification.message,
        timestamp: getCurrentTimeString(),
        classification,
        originalPrompt: clarificationAnswer?.originalIssue || trimmed,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI triage request failed:', error);

      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'assistant',
          text: `I couldn't analyze your issue because the backend request failed. ${error.message}`,
          timestamp: getCurrentTimeString(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Clear chat
  const handleClearChat = () => {
    setMessages([
      {
        id: `msg-welcome-${Date.now()}`,
        sender: 'assistant',
        text: 'Hello! How can I help you with your IT issues today?',
        timestamp: getCurrentTimeString(),
        classification: null,
      },
    ]);
    setCreatedReferences({});
    setAutomatedResetSuccess({});
    inputRef.current?.focus();
  };

  // Open modal to confirm creating an incident ticket
  const handleInitiateCreateTicket = (message) => {
    const classification = message.classification || {};

    setTicketModalData({
      messageId: message.id,
      summary: classification.summary || `IT Incident: ${message.originalPrompt || 'Technical Issue'}`,
      description: `User Reported Issue: "${message.originalPrompt || 'Technical Assistance Needed'}"\n\nPreliminary Chatbot Troubleshooting: Steps completed without resolution.\nSystem Classification: ${classification.intent || 'Incident'}\nCategory: ${classification.category || 'General IT Inquiry'}`,
      category: classification.category || 'General IT Inquiry',
      priority: classification.priority || 'P3 - Medium',
      recommendedGroup: classification.recommendedGroup || (
        /network|vpn/i.test(classification.category || '')
          ? 'Network Support'
          : 'ServiceDesk Tier-1 Queue'
      ),
      department: 'Software Engineering',
      slaDue: classification.priority?.includes('P1') ? '30m' : classification.priority?.includes('P2') ? '2h 00m' : '8h 00m',
    });
  };

  // Confirm ticket creation from modal
  
    const handleConfirmCreateTicket = async (e) => {
      e.preventDefault();

      if (!ticketModalData || isCreatingTicket) return;

      setIsCreatingTicket(true);
      setTicketCreationError('');

      const newTicket = {
        title: ticketModalData.summary,
        description: ticketModalData.description,
        requester: 'Sarah Chen (Current User)',
        requesterEmail: 'sarah.chen@enterprise.internal',
        department: ticketModalData.department,
        category: ticketModalData.category,
        priority: ticketModalData.priority,
        status: 'New',
        assignee: 'Unassigned',
        assignmentGroup: ticketModalData.recommendedGroup || (
          /cloud/i.test(ticketModalData.category || '')
            ? 'Incident Management / SRE'
            : /network|vpn/i.test(ticketModalData.category || '')
              ? 'Network Support'
              : 'ServiceDesk Tier-1 Queue'
        ),
        slaDue: ticketModalData.slaDue,
        resolvedByAi: false,
        isUserCreated: true,
      };

      try {
        // Wait for FastAPI to confirm the MongoDB save.
        const savedTicket = await onAddTicket(newTicket);

        if (!savedTicket?.id) {
          throw new Error('The backend did not return a saved incident ID.');
        }

        setCreatedReferences((prev) => ({
          ...prev,
          [ticketModalData.messageId]: {
            refId: savedTicket.id,
            type: 'Incident',
            title: savedTicket.title,
          },
        }));

        setMessages((prev) => [
          ...prev,
          {
            id: `confirm-${Date.now()}`,
            sender: 'assistant',
            text: `Incident saved successfully. Reference ID: ${savedTicket.id}. Priority: ${savedTicket.priority}. Assigned group: ${savedTicket.assignmentGroup || newTicket.assignmentGroup}. Status: ${savedTicket.status}.`,
            timestamp: getCurrentTimeString(),
            isConfirmation: true,
            ticketId: savedTicket.id,
          },
        ]);

        setTicketModalData(null);
      } catch (error) {
        console.error('Chatbot incident creation failed:', error);
        setTicketCreationError(
          `${error?.message || 'Incident could not be saved.'} Your entered details are still available. Please check the connection and retry.`
        );
      } finally {
        setIsCreatingTicket(false);
      }
    };

  // Submit Software Request directly
  const handleSubmitSoftwareRequest = async (message) => {
    const classification = message.classification || {};
    const softwareName =
      classification.softwareName || 'Software Application';

    if (!onAddSoftwareRequest) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-req-${Date.now()}`,
          sender: 'assistant',
          text: 'Software request service is unavailable. Please try again.',
          timestamp: getCurrentTimeString(),
        },
      ]);
      return;
    }

    try {
      const newRequest = {
        requestedSoftware: softwareName,
        status: 'Provisioning',
        requester: 'Sarah Chen (Current User)',
        department: 'Software Engineering',
      };

      // Backend-la save panni actual ID receive pannum
      const savedRequest = await onAddSoftwareRequest(newRequest);

      if (!savedRequest?.id) {
        throw new Error('Backend did not return a request ID.');
      }

      const refId = savedRequest.id;

      setCreatedReferences((prev) => ({
        ...prev,
        [message.id]: {
          refId,
          type: 'Software Request',
          title: `Software Request: ${softwareName}`,
        },
      }));

      setMessages((prev) => [
        ...prev,
        {
          id: `confirm-req-${Date.now()}`,
          sender: 'assistant',
          text: `Software request submitted successfully. Reference: **${refId}**. Application: **${softwareName}**. Status: **${savedRequest.status || 'Provisioning'}**.`,
          timestamp: getCurrentTimeString(),
          isConfirmation: true,
          ticketId: refId,
        },
      ]);
    } catch (error) {
      console.error('Chatbot software request failed:', error);

      setMessages((prev) => [
        ...prev,
        {
          id: `error-req-${Date.now()}`,
          sender: 'assistant',
          text: `Software request could not be saved. ${error?.message || 'Please try again.'}`,
          timestamp: getCurrentTimeString(),
        },
      ]);
    }
  };

  // Assessment-safe password guidance. No real password reset, MFA bypass,
  // temporary credential, or directory unlock is performed by this UI.
  const handleExecutePasswordReset = (messageId) => {
    setAutomatedResetSuccess((prev) => ({
      ...prev,
      [messageId]: true,
    }));

    setMessages((prev) => [
      ...prev,
      {
        id: `confirm-pwd-${Date.now()}`,
        sender: 'assistant',
        text: 'This is a simulated self-service guidance step only. Please use your organization’s approved password-reset and identity-verification workflow. No password was reset, no bypass link was issued, and no account or directory setting was changed. If verification fails or the account remains locked, contact IAM Support.',
        timestamp: getCurrentTimeString(),
        isConfirmation: true,
      },
    ]);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm flex flex-col h-[580px] sm:h-[650px] overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b border-slate-200/90 px-4 sm:px-5 py-3.5 bg-slate-50/80 text-slate-900">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight leading-tight">
                IT Helpdesk Virtual Assistant
              </h3>
              <span className="text-[9px] sm:text-[10px] font-semibold bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full border border-cyan-200 font-mono">
                AI-Based Issue Analysis
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500">
              Troubleshooting guidance, solutions from verified guides, and fast ticket escalation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Reset conversation"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Suggested Questions Bar */}
      <div className="border-b border-slate-200/80 bg-slate-50/50 px-3 sm:px-5 py-2.5">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider shrink-0 flex items-center gap-1 font-mono">
            <Sparkles className="w-3 h-3 text-cyan-600" />
            Try Asking:
          </span>
          {SUGGESTED_QUESTIONS.map((question, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isTyping}
              onClick={() => handleSendMessage(question)}
              className="px-2.5 sm:px-3 py-1 text-xs bg-white hover:bg-cyan-50 hover:text-cyan-800 hover:border-cyan-300 text-slate-700 rounded-full border border-slate-200 shrink-0 transition-all shadow-xs font-medium active:scale-95 text-[11px]"
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 bg-slate-50/40">
        {messages.map((message) => {
          const isUser = message.sender === 'user';
          const classification = message.classification;
          const refData = createdReferences[message.id];
          const isResetSuccess = automatedResetSuccess[message.id];

          return (
            <div
              key={message.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold shadow-xs ${
                  isUser
                    ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white'
                    : 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white ring-2 ring-white'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-2xl space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-xs'
                      : message.isConfirmation
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-tl-xs'
                      : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                  }`}
                >
                  {classification?.matchedKnowledgeSource ? (
                    (() => {
                      const article = formatKnowledgeAnswer(message.text);

                      return (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-cyan-700">
                            <BookOpen className="w-4 h-4" />
                            <span className="font-bold text-sm">
                              Recommended Troubleshooting
                            </span>
                          </div>

                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                            <h4 className="font-bold text-slate-900 text-sm mb-2">
                              {article.title}
                            </h4>

                            {article.steps.length > 0 ? (
                              <ol className="list-decimal list-outside ml-5 space-y-2 text-xs text-slate-700 leading-relaxed">
                                {article.steps.map((step, idx) => (
                                  <li key={idx} className="pl-1">{step}</li>
                                ))}
                              </ol>
                            ) : (
                              <p className="text-xs text-slate-700 leading-relaxed">
                                {article.fallbackContent}
                              </p>
                            )}

                            {article.warning.length > 0 && (
                              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                                <p className="font-semibold text-amber-800 text-xs">Important safety warning</p>
                                <ul className="list-disc list-outside ml-4 mt-1 space-y-1 text-xs text-amber-800">
                                  {article.warning.map((item, idx) => <li key={idx}>{item}</li>)}
                                </ul>
                              </div>
                            )}

                            {article.escalation.length > 0 && (
                              <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-2.5">
                                <p className="font-semibold text-cyan-800 text-xs">When to contact IT Support</p>
                                <ul className="list-disc list-outside ml-4 mt-1 space-y-1 text-xs text-cyan-800">
                                  {article.escalation.map((item, idx) => <li key={idx}>{item}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                    );
                    })()
                  ) : (
                    <p className="whitespace-pre-line font-medium text-xs">
                      {message.text}
                    </p>
                  )}
                  {/* Clarification Options */}
                    {message.clarification && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.clarification.options.map((option) => (
                          <button
                            key={option}
                            type="button"
                            disabled={isTyping}
                            onClick={() =>
                              handleSendMessage(option, {
                                originalIssue: message.clarification.originalIssue,
                                key: message.clarification.key,
                                value: option,
                              })
                            }
                            className="px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}

                  {/* Classification Metadata Badge Card (for Assistant responses) */}
                  {classification && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5 text-xs">
                      {/* Classification summary: clear labels and visible separation */}
                      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] uppercase font-semibold text-slate-500">Intent:</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              classification.intent === 'Incident'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : classification.intent === 'Automatable Issue'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : classification.intent === 'Service Request'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {classification.intent || 'Needs Review'}
                          </span>
                        </div>
                        <span aria-hidden="true" className="text-slate-300">|</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] uppercase font-semibold text-slate-500">Category:</span>
                          <CategoryBadge category={classification.category} />
                        </div>
                        <span aria-hidden="true" className="text-slate-300">|</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] uppercase font-semibold text-slate-500">Priority:</span>
                          <PriorityBadge priority={classification.priority} />
                        </div>
                      </div>                      

                      {/* Recommended support group / routing */}
                      {classification.recommendedGroup && (
                        <div className="flex flex-wrap items-start gap-x-2 gap-y-1 rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2 text-[11px]">
                          <span className="shrink-0 whitespace-nowrap font-semibold text-cyan-800">
                            Recommended assignment:
                          </span>
                          <span className="min-w-0 flex-1 whitespace-normal break-words text-cyan-900">
                            {String(classification.recommendedGroup).trim()}
                          </span>
                        </div>
                      )}

                      {/* 4-Point Plain English Explanation Card (Requirement 2) - Kept as sleek dark focal card */}
                      {classification.plainExplanation && (
                        <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 text-xs space-y-1.5 text-slate-200 shadow-sm">
                          <p className="font-bold text-cyan-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                            How the AI Understood Your Issue
                          </p>
                          <div className="space-y-2 text-[11px] leading-relaxed text-slate-300">
                            <p>
                              <strong className="text-white">Problem identified:</strong> {classification.plainExplanation.identifiedProblem}
                            </p>
                            <p>
                              <strong className="text-white">Category reasoning ({classification.category}):</strong> {classification.plainExplanation.categoryReason}
                            </p>
                            <p>
                              <strong className="text-white">Business impact ({classification.plainExplanation.impact}):</strong> {classification.plainExplanation.impactReason}
                            </p>
                            <p>
                              <strong className="text-white">Urgency ({classification.plainExplanation.urgency}):</strong> {classification.plainExplanation.urgencyReason}
                            </p>
                            <p>
                              <strong className="text-white">Suggested priority ({classification.priority}):</strong> {classification.plainExplanation.priorityReason}
                            </p>
                            <p>
                              <strong className="text-white">Recommended next step:</strong> {classification.plainExplanation.nextSteps}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Troubleshooting Steps */}
                      {classification.troubleshootingSteps && (
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-slate-700 text-xs">
                          <p className="font-semibold text-slate-900 mb-1.5 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-cyan-600" />
                            Recommended Numbered Steps:
                          </p>
                          <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed text-slate-600 pl-0.5">
                            {classification.troubleshootingSteps.map((step, idx) => (
                              <li key={idx} className="leading-snug">
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Grounded Knowledge Source Attribution */}
                      {classification.matchedKnowledgeSource ? (
                        <div className="flex items-center gap-1.5 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-700">
                          <BookOpen className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                          <span className="font-bold text-slate-800">Verified Help Article:</span>
                          <span className="font-mono text-cyan-700 font-bold">
                            {classification.matchedKnowledgeSource.id}
                          </span>
                          <span className="truncate text-slate-600">
                            - {classification.matchedKnowledgeSource.title}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-800">
                          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>We could not find a relevant help article for this issue.</span>
                        </div>
                      )}

                      {/* Action buttons (Create Ticket, Submit Software Request, Automate Reset) */}
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        {/* If reference was already created */}
                        {refData ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{refData.type} Logged: {refData.refId}</span>
                          </div>
                        ) : (
                          <>
                            {/* Service Request Button */}
                            {classification.isSoftwareRequest && (
                              <button
                                type="button"
                                onClick={() => handleSubmitSoftwareRequest(message)}
                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors"
                              >
                                <Laptop className="w-3.5 h-3.5" />
                                Submit Software Request ({classification.softwareName})
                              </button>
                            )}

                            {/* Automatable Issue: One-click password reset */}
                            {classification.isAutomatable && !isResetSuccess && (
                              <button
                                type="button"
                                onClick={() => handleExecutePasswordReset(message.id)}
                                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                Try Quick Account Unlock (Simulated)
                              </button>
                            )}

                            {/* Incident / Escalation Ticket Button */}
                            {classification.canCreateTicket && (
                              <button
                                type="button"
                                onClick={() => handleInitiateCreateTicket(message)}
                                className={`px-3.5 py-1.5 rounded-lg font-medium text-xs shadow-xs flex items-center gap-1.5 transition-colors ${
                                  classification.requiresTicket
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                                    : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Create Incident Ticket
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {/* Demo classifier notice */}
                      <p className="text-[10px] text-slate-500 italic">
                        {classification.classifierNotice}
                      </p>
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <span
                  className={`text-[10px] text-slate-400 block px-1 ${
                    isUser ? 'text-right' : 'text-left'
                  }`}
                >
                  {message.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-cyan-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-600 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-cyan-600 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-cyan-600 animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-xs text-slate-500 font-medium ml-2">
                  Analyzing your issue with the backend AI model...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <div className="border-t border-slate-200/90 bg-white p-3 sm:p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isTyping}
            placeholder="Type your IT issue, error message, or software request... (Press Enter)"
            className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all shrink-0 active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>

        <div className="mt-2 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500">
          <span>Enterprise Technical Support • Sandbox AI Assistance</span>
          <span className="font-mono text-cyan-700">Hugging Face AI Triage</span>
        </div>
      </div>

      {/* Ticket Creation Confirmation Modal */}
      {ticketModalData && (
        <Modal
          isOpen={true}
          onClose={() => setTicketModalData(null)}
          title="Create IT Incident Ticket"
          maxWidth="max-w-xl"
          footer={
            <>
              <button
                type="button"
                onClick={() => setTicketModalData(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              {ticketCreationError && (
                <p role="alert" className="text-xs text-red-600">
                  {ticketCreationError}
                </p>
              )}
              <button
                type="button"
                disabled={isCreatingTicket}
                onClick={handleConfirmCreateTicket}
                className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                {isCreatingTicket ? 'Saving...' : 'Confirm & Save Incident'}
              </button>
            </>
          }
        >
          <form onSubmit={handleConfirmCreateTicket} className="space-y-3.5 text-xs text-slate-800">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                  Generated System Reference
                </span>
                <span className="font-mono text-sm font-bold text-cyan-700">
                  Pending backend assignment
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                  Target Resolution SLA
                </span>
                <span className="font-mono font-medium text-slate-800">
                  {ticketModalData.slaDue}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                  Status
                </span>
                <span className="font-medium text-emerald-600">
                  New (In Queue)
                </span>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Incident Summary <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={ticketModalData.summary}
                onChange={(e) =>
                  setTicketModalData({ ...ticketModalData, summary: e.target.value })
                }
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={ticketModalData.category}
                  onChange={(e) =>
                    setTicketModalData({ ...ticketModalData, category: e.target.value })
                  }
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                >
                  {![
                    'Network & VPN',
                    'Identity & SSO',
                    'Software Access',
                    'Hardware',
                    'Email & O365',
                    'Cloud Infrastructure',
                    'General IT Inquiry',
                  ].includes(ticketModalData.category) && (
                    <option value={ticketModalData.category}>
                      {ticketModalData.category}
                    </option>
                  )}
                  <option value="Network & VPN">Network & VPN</option>
                  <option value="Identity & SSO">Identity & SSO</option>
                  <option value="Software Access">Software Access</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Email & O365">Email & O365</option>
                  <option value="Cloud Infrastructure">Cloud Infrastructure</option>
                  <option value="General IT Inquiry">General IT Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Priority</label>
                <select
                  value={ticketModalData.priority}
                  onChange={(e) =>
                    setTicketModalData({ ...ticketModalData, priority: e.target.value })
                  }
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                >
                  <option value="P1 - Critical">P1 - Critical (Outage)</option>
                  <option value="P2 - High">P2 - High (Degraded)</option>
                  <option value="P3 - Medium">P3 - Medium (Workaround)</option>
                  <option value="P4 - Low">P4 - Low (Inquiry)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Recommended Assignment Group
              </label>
              <input
                type="text"
                value={ticketModalData.recommendedGroup || ''}
                onChange={(e) =>
                  setTicketModalData({
                    ...ticketModalData,
                    recommendedGroup: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="Enter assignment group"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Detailed Incident Diagnostics &amp; Steps
              </label>
              <textarea
                rows={4}
                value={ticketModalData.description}
                onChange={(e) =>
                  setTicketModalData({ ...ticketModalData, description: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-900 text-slate-100 border border-slate-800 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-[11px] text-amber-900">
              <span className="font-semibold text-amber-700">Notice:</span> Creating this ticket saves it directly to the shared frontend state, making it immediately visible on the ITSM Dashboard.
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
