import React from 'react';
import {
  Bell,
  BellRing,
  Sun,
  Moon,
  LayoutDashboard,
  Map,
  Activity,
  HeartPulse,
} from 'lucide-react';

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
    <>
      {/* Top Header Bar (Desktop & Mobile Single Row) */}
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 h-14 sm:h-16">
          {/* Zone 1: Brand Wordmark */}
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

          {/* Zone 2: Desktop 4 Clean Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
            <button
              onClick={() => onTabChange('overview')}
              className={`transition-colors whitespace-nowrap shrink-0 py-2 hover:text-slate-900 dark:hover:text-slate-100 ${
                activeTab === 'overview' ? 'text-cyan-600 dark:text-cyan-400 font-semibold' : ''
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => onTabChange('map')}
              className={`transition-colors whitespace-nowrap shrink-0 py-2 hover:text-slate-900 dark:hover:text-slate-100 ${
                activeTab === 'map' ? 'text-cyan-600 dark:text-cyan-400 font-semibold' : ''
              }`}
            >
              Google Map
            </button>
            <button
              onClick={() => onTabChange('trends')}
              className={`transition-colors whitespace-nowrap shrink-0 py-2 hover:text-slate-900 dark:hover:text-slate-100 ${
                activeTab === 'trends' ? 'text-cyan-600 dark:text-cyan-400 font-semibold' : ''
              }`}
            >
              24H Telemetry
            </button>
            <button
              onClick={() => onTabChange('advisory')}
              className={`transition-colors whitespace-nowrap shrink-0 py-2 hover:text-slate-900 dark:hover:text-slate-100 ${
                activeTab === 'advisory' ? 'text-cyan-600 dark:text-cyan-400 font-semibold' : ''
              }`}
            >
              Health Advisory
            </button>
          </nav>

          {/* Zone 3: Actions (Theme Toggle + Push Alerts CTA) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Light / Dark Mode Toggle (Min 44x44px touch target) */}
            <button
              onClick={onToggleTheme}
              className="w-10 h-10 min-w-[40px] rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center transition-colors active:scale-95"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Alert Bell Button */}
            <button
              onClick={onOpenAlertModal}
              className={`h-10 px-3 sm:px-3.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 active:scale-95 ${
                hasActiveAlert
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-sm'
                  : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
              }`}
            >
              {hasActiveAlert ? (
                <BellRing className="w-4 h-4 animate-bounce shrink-0" />
              ) : (
                <Bell className="w-4 h-4 shrink-0" />
              )}
              <span className="hidden xs:inline">Alerts</span>
              {alertCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-amber-400 text-[10px] font-mono font-bold">
                  {alertCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar (Thumb-Zone Optimized Pattern) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 h-16 px-2 flex items-center justify-around shadow-lg transition-colors"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <button
          onClick={() => onTabChange('overview')}
          className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === 'overview'
              ? 'text-cyan-600 dark:text-cyan-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Overview</span>
        </button>

        <button
          onClick={() => onTabChange('map')}
          className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === 'map'
              ? 'text-cyan-600 dark:text-cyan-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Map className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Google Map</span>
        </button>

        <button
          onClick={() => onTabChange('trends')}
          className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === 'trends'
              ? 'text-cyan-600 dark:text-cyan-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">24H Trends</span>
        </button>

        <button
          onClick={() => onTabChange('advisory')}
          className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === 'advisory'
              ? 'text-cyan-600 dark:text-cyan-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <HeartPulse className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Advisory</span>
        </button>
      </nav>
    </>
  );
};
