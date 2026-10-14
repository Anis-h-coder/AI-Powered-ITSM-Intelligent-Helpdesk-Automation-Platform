import React from 'react';
import {
  UserCheck,
  LayoutDashboard,
  BrainCircuit,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Server,
  Layers,
  Sparkles,
  Zap,
  Code2
} from 'lucide-react';

export const NAVIGATION_SECTIONS = [
  {
    category: 'PLATFORM',
    items: [
      {
        id: 'landing-page',
        label: 'Landing Page',
        icon: Sparkles,
        badgeText: 'Home',
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        description: 'Product overview & core architecture',
      },
    ]
  },
  {
    category: 'WORKSPACE & OPS',
    items: [
      {
        id: 'employee-self-service',
        label: 'Employee Self-Service',
        icon: UserCheck,
        badgeText: 'Portal',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
        description: 'Submit tickets & service catalog',
      },
      {
        id: 'itsm-dashboard',
        label: 'ITSM Dashboard',
        icon: LayoutDashboard,
        badgeText: 'Ops',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        description: 'Incident queue & SLA monitors',
      },
    ]
  },
  {
    category: 'AI & AUTOMATION',
    items: [
      {
        id: 'ai-analysis',
        label: 'AI Analysis',
        icon: BrainCircuit,
        badgeText: 'Triage',
        badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
        description: 'AI-based issue analysis & triage',
      },
      {
        id: 'auto-resolution',
        label: 'Auto-Resolution',
        icon: Zap,
        badgeText: 'Fixes',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        description: 'Automated issue resolution with safety checks',
      },
      {
        id: 'knowledge-base',
        label: 'Knowledge Base',
        icon: BookOpen,
        badgeText: 'SOPs',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        description: 'Troubleshooting guides & verified SOPs',
      },
    ]
  }
];

// Flat export for compatibility
export const NAVIGATION_ITEMS = NAVIGATION_SECTIONS.flatMap(s => s.items);

export function Sidebar({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenTechModal
}) {
  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container - fixed top-16 bottom-0 so it stays rigidly in place on page scroll */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 flex flex-col justify-between border-r border-slate-200/90 bg-white/95 backdrop-blur-xl shadow-xs transition-all duration-200 text-slate-700 ${
          isCollapsed ? 'w-16' : 'w-64'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Navigation links - scrollable with visible custom scrollbar */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3.5 min-h-0 custom-sidebar-scroll space-y-4">
          {NAVIGATION_SECTIONS.map((section, idx) => (
            <div key={section.category} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-2 pb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold tracking-wider uppercase text-slate-400">
                    {section.category}
                  </span>
                  {idx === 0 && (
                    <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1 rounded border border-slate-200/80">
                      Tier-2
                    </span>
                  )}
                </div>
              ) : (
                <div className="h-2"></div>
              )}

              <nav className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      title={isCollapsed ? item.label : undefined}
                      className={`group relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50/70 text-blue-950 border border-blue-200/90 shadow-xs font-bold'
                          : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 border border-transparent'
                      }`}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-r"></span>
                      )}

                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                          isActive
                            ? 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 text-white shadow-sm shadow-blue-500/25 ring-1 ring-blue-600/30'
                            : 'bg-slate-100/90 text-slate-500 group-hover:text-blue-600 group-hover:bg-blue-50/80 group-hover:scale-105'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>

                      {!isCollapsed && (
                        <div className="flex flex-1 items-center justify-between overflow-hidden text-left min-w-0">
                          <span className="truncate text-xs">{item.label}</span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ml-1.5 border font-semibold ${
                              isActive
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : `${item.badgeColor}`
                            }`}
                          >
                            {item.badgeText}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Sidebar Footer: System Status Telemetry Card */}
        <div className="shrink-0 border-t border-slate-200/90 p-3 bg-slate-50/90 backdrop-blur-md">
          {!isCollapsed ? (
            <div className="space-y-2">
              <div className="rounded-xl bg-white p-2.5 border border-slate-200/90 shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[11px] font-bold text-slate-900">Safety Guardrails</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 px-1 rounded border border-emerald-200">
                    ACTIVE
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Auto Deflection (Target):</span>
                    <span className="text-blue-700 font-bold font-mono text-[10px]">78.4%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Target SLA Compliance:</span>
                    <span className="text-emerald-700 font-bold font-mono text-[10px]">99.8%</span>
                  </div>
                </div>

                {onOpenTechModal && (
                  <button
                    onClick={onOpenTechModal}
                    className="w-full mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-blue-600 hover:text-blue-700 font-medium hover:underline cursor-pointer"
                  >
                    <span>How It Works &amp; Architecture</span>
                    <Code2 className="w-3.5 h-3.5 text-blue-600" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
                <span className="font-mono text-[10px]">Enterprise v2.4</span>
                <button
                  onClick={onToggleCollapse}
                  className="p-1 hover:text-slate-900 hover:bg-slate-200/70 rounded-md transition-colors"
                  title="Collapse sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" title="AI Guardrail Engine: Healthy"></div>
              <button
                onClick={onToggleCollapse}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-md transition-colors"
                title="Expand sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
