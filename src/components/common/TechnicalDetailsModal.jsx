import React, { useState } from 'react';
import {
  Code2,
  Database,
  Cpu,
  Server,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Zap,
  HelpCircle
} from 'lucide-react';
import { Modal } from './Modal.jsx';

/**
 * Technical Details & Architecture Modal ("How It Works")
 * Provides simple, clear explanations of core enterprise AI technologies:
 * - RAG (Retrieval-Augmented Generation)
 * - LLM (Large Language Model)
 * - Embeddings
 * - Vector Database
 * - FastAPI
 * - MongoDB Atlas
 *
 * Keeps the platform technically credible for enterprise evaluations while
 * empowering freshers to explain the entire workflow with confidence.
 */
export function TechnicalDetailsModal({ isOpen, onClose }) {
  const [activeTopic, setActiveTopic] = useState('rag');

  const TECH_TOPICS = [
    {
      id: 'rag',
      name: 'RAG (Retrieval-Augmented Generation)',
      shortDef: 'Finds relevant knowledge articles before preparing an answer.',
      icon: BookOpen,
      color: 'blue',
      badge: 'Core Pattern',
      simpleExplanation:
        'Instead of asking an AI to guess answers from memory, RAG searches verified documents (like our standard operating procedures) first. It attaches those real documents to the question so the AI produces factual, verified troubleshooting steps.',
      operationalStatus: 'Lexical keyword search active now. Ready for vector database connection.',
      interviewTip:
        'Explain that RAG prevents AI hallucinations because answers are directly grounded in verified company SOP documents.',
    },
    {
      id: 'llm',
      name: 'LLM (Large Language Model)',
      shortDef: 'An AI model that understands questions and generates human-like responses.',
      icon: Cpu,
      color: 'purple',
      badge: 'Reasoning Engine',
      simpleExplanation:
        'A Large Language Model reads the employee\'s natural language description (e.g. "My VPN keeps dropping"), figures out what is wrong, and writes clear, friendly troubleshooting steps using the retrieved documents.',
      operationalStatus: 'Client-side inference engine in active runtime. Ready for Gemini or Claude API integration.',
      interviewTip:
        'Highlight that confidence scores and classifications strictly adhere to enterprise safety standards.',
    },
    {
      id: 'embeddings',
      name: 'Embeddings',
      shortDef: 'Numerical representations that capture the meaning of text.',
      icon: Layers,
      color: 'emerald',
      badge: 'Vector Science',
      simpleExplanation:
        'Computers understand numbers better than words. Embeddings convert sentences into lists of numbers (vectors). Sentences with similar meanings (like "VPN disconnected" and "Can\'t access corporate network") end up close together in numbers.',
      operationalStatus: 'Structured knowledge base articles are chunked and pre-formatted for embedding generation.',
      interviewTip:
        'Explain that embeddings allow search to work by conceptual meaning, not just exact keyword matches.',
    },
    {
      id: 'vector-db',
      name: 'Vector Database',
      shortDef: 'Stores numerical representations for fast similarity-based searches.',
      icon: Database,
      color: 'amber',
      badge: 'Search Store',
      simpleExplanation:
        'A specialized database built to store embeddings. When an employee asks a question, the vector database quickly searches thousands of article chunks and returns the top 2 or 3 most relevant matches in milliseconds.',
      operationalStatus: 'Local semantic index using the verified 8-article Knowledge Base dataset.',
      interviewTip:
        'Mention MongoDB Atlas Vector Search or Pinecone as enterprise examples that integrate with the data layer.',
    },
    {
      id: 'fastapi',
      name: 'FastAPI',
      shortDef: 'Connects the frontend interface to the Python AI backend.',
      icon: Zap,
      color: 'cyan',
      badge: 'API Gateway',
      simpleExplanation:
        'A high-performance Python web framework used to build backend REST APIs. It receives requests from this React application, runs AI models or database queries, and sends clean JSON responses back.',
      operationalStatus: 'Planned backend target architecture. Current UI runs on React for seamless portability.',
      interviewTip:
        'Emphasize that FastAPI provides asynchronous speed and automatic OpenAPI documentation for enterprise microservices.',
    },
    {
      id: 'mongodb',
      name: 'MongoDB Atlas',
      shortDef: 'Stores application data and documents in a flexible cloud database.',
      icon: Server,
      color: 'rose',
      badge: 'Cloud Storage',
      simpleExplanation:
        'A fully managed cloud database. It stores employee support tickets, audit logs, user profiles, and knowledge base articles with high availability and enterprise security.',
      operationalStatus: 'Synchronized in-memory operational state with real-time ticket and request queues.',
      interviewTip:
        'Note that MongoDB Atlas also includes native Vector Search, allowing document storage and semantic AI search in one unified service.',
    },
  ];

  const currentTopic = TECH_TOPICS.find((t) => t.id === activeTopic) || TECH_TOPICS[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="How It Works: Technical Architecture & AI Concepts"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5 text-slate-800">
        {/* Top Quick Overview Banner */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-cyan-50 border border-blue-200 rounded-xl p-4 text-xs text-slate-800 flex items-start gap-3 shadow-xs">
          <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-slate-900 flex items-center gap-2">
              Enterprise ITSM AI Workflow at a Glance
              <span className="text-[10px] bg-blue-100 text-blue-800 font-mono px-2 py-0.5 rounded border border-blue-200">
                Core Pipeline
              </span>
            </p>
            <p className="text-slate-600 leading-relaxed">
              <strong className="text-blue-700">Employee Question</strong> &rarr; <strong className="text-indigo-700">RAG Search</strong> (finds matching SOPs) &rarr; <strong className="text-purple-700">AI Classification</strong> (identifies issue &amp; urgency) &rarr; <strong className="text-emerald-700">Guided Troubleshooting</strong> or <strong className="text-cyan-700">Safe Self-Heal Action</strong> &rarr; <strong className="text-amber-700">Ticket Creation</strong> if unresolved.
            </p>
          </div>
        </div>

        {/* 2-Column Explorer: Left Tabs, Right Explanation */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left: Term selector tabs */}
          <div className="md:col-span-5 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block px-1">
              Key Technologies
            </span>
            <div className="space-y-1.5">
              {TECH_TOPICS.map((topic) => {
                const Icon = topic.icon;
                const isSelected = activeTopic === topic.id;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setActiveTopic(topic.id)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-500 text-blue-900 shadow-xs font-semibold ring-1 ring-blue-500/20'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold truncate">{topic.name.split(' (')[0]}</span>
                        <span className="text-[9px] font-mono text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200">
                          {topic.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
                        {topic.shortDef}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Detailed Plain-English Breakdown */}
          <div className="md:col-span-7 bg-slate-50/80 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 text-xs">
            {/* Header */}
            <div className="pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-md border border-blue-200 font-mono">
                  {currentTopic.badge}
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Enterprise Concept
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-900 mt-1">
                {currentTopic.name}
              </h4>
              <p className="text-xs text-slate-600 mt-1">
                {currentTopic.shortDef}
              </p>
            </div>

            {/* Plain English explanation */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Simple Explanation (Easy to explain in an interview)
              </span>
              <p className="text-xs text-slate-800 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                {currentTopic.simpleExplanation}
              </p>
            </div>

            {/* Current operational status */}
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-blue-950">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block mb-0.5">
                Target Architecture &amp; Execution Scope
              </span>
              <p className="text-[11px] text-blue-900/90 leading-snug">
                {currentTopic.operationalStatus}
              </p>
            </div>

            {/* Architecture Tip */}
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-900">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5 mb-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Enterprise Architecture Overview
              </span>
              <p className="text-[11px] text-emerald-800/90 leading-snug">
                {currentTopic.interviewTip}
              </p>
            </div>
          </div>
        </div>

        {/* Footer info note */}
        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-500">
          <span>
            Note: All automated actions and confidence scores in this platform adhere to strict enterprise safety standards.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors shrink-0 shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
