import React from 'react';

export function StatCard({
  title,
  value,
  change,
  changeType = 'positive',
  subtitle,
  icon: Icon,
  variant = 'dark' // 'dark' (high-contrast sleek focal card) | 'light'
}) {
  const isPositive = changeType === 'positive';
  const isNegative = changeType === 'negative';
  const isDark = variant === 'dark';

  if (isDark) {
    return (
      <div className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-4 sm:p-5 shadow-md shadow-slate-900/10 text-white transition-all duration-200 hover:-translate-y-0.5 card-elevate relative overflow-hidden group">
        {/* Top ambient color highlight line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 opacity-70 group-hover:opacity-100 transition-opacity"></div>

        <div className="flex items-center justify-between text-slate-400 mb-2 sm:mb-2.5">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-300">
            {title}
          </span>
          {Icon && (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-800 border border-slate-700 group-hover:border-cyan-500/50 flex items-center justify-center text-cyan-400 transition-all">
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono tabular-nums">
            {value}
          </span>
          {change && (
            <span
              className={`text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-md font-mono ${
                isPositive
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                  : isNegative
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {change}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate group-hover:text-slate-300 transition-colors">
            {subtitle}
          </p>
        )}
      </div>
    );
  }

  // Default: Crisp Clean White Theme Card with Rich Visual Accents
  return (
    <div className="bg-white border border-slate-200/90 hover:border-blue-400/80 rounded-2xl p-4 sm:p-5 shadow-xs ring-1 ring-slate-900/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md card-elevate relative overflow-hidden group">
      {/* Top subtle highlight gradient hairline */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>

      <div className="flex items-center justify-between text-slate-500 mb-2 sm:mb-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-800 transition-colors">
          {title}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/80 border border-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 shadow-xs transition-all">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
        <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
          {value}
        </span>
        {change && (
          <span
            className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-md font-mono ${
              isPositive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isNegative
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {change}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate group-hover:text-slate-700 transition-colors">
          {subtitle}
        </p>
      )}
    </div>
  );
}
