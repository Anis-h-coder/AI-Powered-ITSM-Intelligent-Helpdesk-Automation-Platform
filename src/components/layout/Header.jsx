import React, { useState } from 'react';
import { Search, Bell, Shield, ChevronDown, CheckCircle2, Menu, X, ArrowRight, Code2, Database, Server, ExternalLink, Cpu } from 'lucide-react';

export function Header({
  activeTab,
  searchQuery,
  onSearchChange,
  isSidebarCollapsed,
  onToggleSidebar,
  isMobileOpen,
  onToggleMobileMenu,
  onNavigateTab,
  onOpenTechModal,
  backendHealth,
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [showHealthMenu, setShowHealthMenu] = useState(false);

  const isAtlas = backendHealth?.database?.isAtlasConnected;
  const storageLabel = isAtlas ? 'MongoDB Atlas' : 'Local Persistent DB';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-200/90 bg-white/95 backdrop-blur-xl px-3 sm:px-4 md:px-6 shadow-xs text-slate-800">
      {/* Top ambient theme gradient hairline */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 opacity-90"></div>

      {/* Left: Mobile hamburger, Enterprise Brand Mark & Title */}
      <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
        {activeTab !== 'landing-page' && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
            aria-label="Toggle navigation menu"
          >
            {isMobileOpen ? <X className="w-5 h-5 text-blue-600" /> : <Menu className="w-5 h-5" />}
          </button>
        )}

        {/* Brand Icon Mark with Theme Glow */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('landing-page')}
          className="cursor-pointer flex items-center gap-2.5 group shrink-0"
          title="Return to Landing Page"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 items-center justify-center shadow-md shadow-blue-500/10 ring-1 ring-black/5 shrink-0 flex group-hover:scale-105 transition-transform">
            <Shield className="w-4.5 h-4.5 text-white" />
          </div>
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] font-bold tracking-wider uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono shrink-0">
              ITSM AI
            </span>
            <span className="text-slate-300 text-xs hidden sm:inline" aria-hidden="true">·</span>
            <span className="hidden sm:inline text-[11px] text-slate-500 font-medium truncate">
              Enterprise Service Management
            </span>
          </div>
          <h1 className="text-xs sm:text-sm md:text-base font-bold text-slate-900 tracking-tight leading-tight truncate">
            <span className="sm:hidden">ITSM Automation Platform</span>
            <span className="hidden sm:inline">AI-Powered ITSM Automation Platform</span>
          </h1>
        </div>
      </div>

      {/* Right: Search, Live Status, Alerts, Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Search Field (Hidden on small screens) */}
        <div className="relative hidden xl:block w-64 2xl:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tickets, KB, SOPs... (/)"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100/80 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-all shadow-inner"
          />
        </div>

        {/* Live System & API Status Badge */}
        <div className="relative">
          <button
            onClick={() => {
              setShowHealthMenu(!showHealthMenu);
              setShowNotificationMenu(false);
              setShowProfileMenu(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 text-xs text-emerald-800 transition-colors cursor-pointer shadow-2xs"
            title="View Live API, Database & ServiceNow Status"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-[11px] hidden sm:inline">{storageLabel}</span>
            <span className="font-semibold text-[11px] sm:hidden">Live</span>
            <ChevronDown className="w-3 h-3 text-emerald-700" />
          </button>

          {showHealthMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl py-3 px-4 z-50 text-xs text-slate-700 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-blue-600" /> System Architecture &amp; APIs
                </span>
                <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                  HEALTHY
                </span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Server className="w-3 h-3 text-purple-600" /> Backend API:
                    </span>
                    <span className="text-emerald-700 font-bold font-mono">FastAPI (Python)</span>
                  </div>
                  <p className="text-slate-500 text-[10px]">Asynchronous REST endpoints with auto-generated OpenAPI schemas.</p>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Database className="w-3 h-3 text-emerald-600" /> Data Storage:
                    </span>
                    <span className="text-blue-700 font-bold font-mono">
                      {isAtlas ? 'MongoDB Atlas' : 'Local Persistent Storage'}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[10px]">
                    {isAtlas
                      ? 'Connected to Atlas cluster. Incidents and knowledge sync live.'
                      : 'Atlas URI not set; saving to persistent local disk store.'}
                  </p>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-cyan-600" /> AI Inference Engine:
                    </span>
                    <span className="text-cyan-700 font-bold font-mono">Hybrid RAG</span>
                  </div>
                  <p className="text-slate-500 text-[10px]">Hugging Face zero-shot classifier + vector cosine embeddings.</p>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-blue-600" /> ServiceNow:
                    </span>
                    <span className="text-amber-700 font-bold font-mono">Mock Adapter Active</span>
                  </div>
                  <p className="text-slate-500 text-[10px]">Simulated Table API with verified payload schemas.</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <a
                  href="/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  <span>OpenAPI Docs (/docs)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() => setShowHealthMenu(false)}
                  className="text-[11px] text-slate-500 hover:text-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>



        {/* Quick Launch Console button when on Landing Page */}
        {activeTab === 'landing-page' && (
          <button
            onClick={() => onNavigateTab && onNavigateTab('itsm-dashboard')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
          >
            <span>Launch Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotificationMenu(!showNotificationMenu);
              setShowProfileMenu(false);
            }}
            className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="System Alerts & Activity"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white"></span>
          </button>

          {showNotificationMenu && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-2xl py-2 z-50 text-xs text-slate-700">
              <div className="px-3.5 py-2.5 border-b border-slate-100 font-semibold text-slate-900 flex justify-between items-center">
                <span>Recent System Alerts</span>
                <span className="text-[10px] text-blue-600 font-mono">Telemetry Active</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                <div className="px-3.5 py-2.5 hover:bg-slate-50 transition-colors">
                  <p className="font-semibold text-slate-900">Anomaly Cluster Detected</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">42 users experiencing Okta push delay. AI hypothesis generated.</p>
                  <span className="text-[10px] text-slate-400">12 mins ago</span>
                </div>
                <div className="px-3.5 py-2.5 hover:bg-slate-50 transition-colors">
                  <p className="font-semibold text-slate-900">SLA Warning: INC-2024-8902</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">P1 Staging RDS connection leak remaining SLA: 18 minutes.</p>
                  <span className="text-[10px] text-slate-400">24 mins ago</span>
                </div>
                <div className="px-3.5 py-2.5 hover:bg-slate-50 transition-colors">
                  <p className="font-semibold text-slate-900">Auto-Remediation Suggested</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">RB-NET-042 runbook mapped with 96% confidence for ticket #8901.</p>
                  <span className="text-[10px] text-slate-400">45 mins ago</span>
                </div>
              </div>
              <div className="px-3.5 pt-2 pb-1 border-t border-slate-100 text-center">
                <button
                  onClick={() => setShowNotificationMenu(false)}
                  className="text-blue-600 hover:text-blue-700 font-medium text-[11px]"
                >
                  Close Menu
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotificationMenu(false);
            }}
            className="flex items-center gap-2 p-1 text-left rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs shrink-0">
              SC
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 leading-tight">Sarah Chen</span>
              <span className="text-[10px] text-slate-500">IT Systems Engineer</span>
            </div>
            <ChevronDown className="hidden lg:block w-3.5 h-3.5 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl py-2 z-50 text-xs text-slate-700">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="font-semibold text-slate-900">Sarah Chen</p>
                <p className="text-slate-500 text-[11px]">sarah.chen@enterprise.internal</p>
                <p className="text-[10px] text-blue-600 mt-0.5">Role: IT Support Specialist &amp; Incident Reviewer</p>
              </div>
              <div className="py-1">
                <div className="px-4 py-1.5 flex items-center justify-between text-slate-700">
                  <span>Shift Status:</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> On Duty
                  </span>
                </div>
                <div className="px-4 py-1.5 flex items-center justify-between text-slate-700">
                  <span>Assigned Queue:</span>
                  <span className="font-mono text-blue-700 font-medium">Tier-2-Core</span>
                </div>
              </div>
              <div className="border-t border-slate-100 px-4 pt-2 pb-1">
                <p className="text-[10px] text-slate-400">
                  Enterprise Service Management · Active Session
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
