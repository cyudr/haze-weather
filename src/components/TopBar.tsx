import React from 'react';
import { Bell, BellRing, Sun, Moon } from 'lucide-react';

interface TopBarProps {
  activeTab: 'overview' | 'map' | 'advisory' | 'trends';
  onTabChange: (tab: 'overview' | 'map' | 'advisory' | 'trends') => void;
  onOpenAlertModal: () => void;
  hasActiveAlert: boolean;
  alertCount: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onTabChange,
  onOpenAlertModal,
  hasActiveAlert,
  alertCount,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            onTabChange('overview');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 flex items-center gap-1.5 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
        >
          <span className="text-cyan-600 dark:text-cyan-400 font-black">SG</span>AirWatch
        </a>

        {/* Zone 2: 4 Clean Single-Line Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <button
            onClick={() => onTabChange('overview')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-slate-100 ${
              activeTab === 'overview' ? 'text-cyan-600 dark:text-cyan-400 font-semibold' : ''
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onTabChange('map')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-slate-100 ${
              activeTab === 'map' ? 'text-cyan-600 dark:text-cyan-400 font-semibold' : ''
            }`}
          >
            Google Map
          </button>
          <button
            onClick={() => onTabChange('trends')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-slate-100 ${
              activeTab === 'trends' ? 'text-cyan-600 dark:text-cyan-400 font-semibold' : ''
            }`}
          >
            24H Telemetry
          </button>
          <button
            onClick={() => onTabChange('advisory')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-slate-100 ${
              activeTab === 'advisory' ? 'text-cyan-600 dark:text-cyan-400 font-semibold' : ''
            }`}
          >
            Health Advisory
          </button>
        </nav>

        {/* Zone 3: Actions (Theme Toggle + Push Alerts CTA) */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          <button
            onClick={onOpenAlertModal}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              hasActiveAlert
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
            }`}
          >
            {hasActiveAlert ? (
              <BellRing className="w-3.5 h-3.5 animate-bounce" />
            ) : (
              <Bell className="w-3.5 h-3.5" />
            )}
            <span>Push Alerts</span>
            {alertCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-slate-950 text-amber-400 text-[10px] font-mono font-bold">
                {alertCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Secondary Navigation Row (Below 768px) */}
      <div className="md:hidden flex items-center justify-around px-2 py-2 border-t border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/90 text-xs">
        <button
          onClick={() => onTabChange('overview')}
          className={`py-1 px-2 font-medium ${activeTab === 'overview' ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500' : 'text-slate-500 dark:text-slate-400'}`}
        >
          Overview
        </button>
        <button
          onClick={() => onTabChange('map')}
          className={`py-1 px-2 font-medium ${activeTab === 'map' ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500' : 'text-slate-500 dark:text-slate-400'}`}
        >
          Google Map
        </button>
        <button
          onClick={() => onTabChange('trends')}
          className={`py-1 px-2 font-medium ${activeTab === 'trends' ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500' : 'text-slate-500 dark:text-slate-400'}`}
        >
          24H Trends
        </button>
        <button
          onClick={() => onTabChange('advisory')}
          className={`py-1 px-2 font-medium ${activeTab === 'advisory' ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500' : 'text-slate-500 dark:text-slate-400'}`}
        >
          Advisory
        </button>
      </div>
    </header>
  );
};
