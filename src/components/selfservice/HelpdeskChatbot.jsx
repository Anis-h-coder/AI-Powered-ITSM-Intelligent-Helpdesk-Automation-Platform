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
import { classifyHelpdeskRequest } from '../../utils/localClassifier.js';
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

  // Handle submitting query
  const handleSendMessage = (textToSend = inputValue) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isTyping) return;

    const userMessageId = `user-${Date.now()}`;
    const userMessage = {
      id: userMessageId,
      sender: 'user',
      text: trimmed,
      timestamp: getCurrentTimeString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate short processing delay
    setTimeout(() => {
      const classification = classifyHelpdeskRequest(trimmed);
      const assistantMessageId = `bot-${Date.now()}`;

      const assistantMessage = {
        id: assistantMessageId,
        sender: 'assistant',
        text: classification.message,
        timestamp: getCurrentTimeString(),
        classification: classification,
        originalPrompt: trimmed,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 450);
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
      category: classification.category || 'Network & VPN',
      priority: classification.priority || 'P2 - High',
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
        assignmentGroup:
          ticketModalData.category === 'Cloud Infrastructure'
            ? 'Cloud Ops / SRE'
            : ticketModalData.category === 'Network & VPN'
              ? 'Network Operations (Tier 2)'
              : 'Service Desk (Tier 1)',
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
            text: `Incident saved successfully. Reference ID: ${savedTicket.id}. Priority: ${savedTicket.priority}. Status: ${savedTicket.status}.`,
            timestamp: getCurrentTimeString(),
            isConfirmation: true,
            ticketId: savedTicket.id,
          },
        ]);

        setTicketModalData(null);
      } catch (error) {
        console.error('Chatbot incident creation failed:', error);
        setTicketCreationError(
          error?.message || 'Incident could not be saved. Please try again.'
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

  // Execute Simulated Automated Password Reset
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
        text: 'Automated self-service verification completed! An emergency 15-minute temporary bypass link was sent to your registered manager and backup phone. Active Directory Kerberos cache has been unlocked.',
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
                  <p className="whitespace-pre-line font-medium text-xs">
                    {message.text}
                  </p>

                  {/* Classification Metadata Badge Card (for Assistant responses) */}
                  {classification && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5 text-xs">
                      {/* Intent & Category Badges */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase font-semibold text-slate-500">
                          Detected Intent:
                        </span>
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
                          {classification.intent}
                        </span>

                        <CategoryBadge category={classification.category} />
                        <PriorityBadge priority={classification.priority} />

                        <span className="text-[10px] font-mono text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 ml-auto">
                          {classification.confidenceText || `Simulated confidence: ${(classification.confidence * 100).toFixed(0)}%`}
                        </span>
                      </div>

                      {/* 4-Point Plain English Explanation Card (Requirement 2) - Kept as sleek dark focal card */}
                      {classification.plainExplanation && (
                        <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 text-xs space-y-1.5 text-slate-200 shadow-sm">
                          <p className="font-bold text-cyan-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                            How the AI Understood Your Issue
                          </p>
                          <div className="space-y-1 text-[11px] leading-relaxed text-slate-300">
                            <p>
                              <strong className="text-white">What problem it identified:</strong> {classification.plainExplanation.identifiedProblem}
                            </p>
                            <p>
                              <strong className="text-white">Why it selected that category:</strong> {classification.plainExplanation.whySelected}
                            </p>
                            <p>
                              <strong className="text-white">How urgent the issue appears:</strong> {classification.plainExplanation.urgency}
                            </p>
                            <p>
                              <strong className="text-white">What you should do next:</strong> {classification.plainExplanation.nextSteps}
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
                  Analyzing technical intent with local classifier...
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
          <span className="font-mono text-cyan-700">Rules Classifier Active</span>
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
