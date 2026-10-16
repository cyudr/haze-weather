import React from 'react';
import { Sliders, RefreshCw, Radio, Sparkles, AlertTriangle } from 'lucide-react';

interface ScenarioSimulatorProps {
  currentScenario: 'live' | 'unhealthy_west' | 'severe_haze' | 'clean_day';
  onSelectScenario: (scenario: 'live' | 'unhealthy_west' | 'severe_haze' | 'clean_day') => void;
  isFetchingLive: boolean;
  onRefreshLive: () => void;
}

export const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = ({
  currentScenario,
  onSelectScenario,
  isFetchingLive,
  onRefreshLive,
}) => {
  return (
    <div className="bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm dark:shadow-md flex flex-wrap items-center justify-between gap-3 transition-colors">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400">
          <Sliders className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
            <span>Air Quality Feed & Simulation Rig</span>
            {currentScenario !== 'live' && (
              <span className="text-[10px] font-mono bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded border border-amber-300 dark:border-amber-500/30">
                Simulation Active
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Switch between official live NEA telemetry and haze stress-test scenarios
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Scenario buttons */}
        <button
          onClick={() => onSelectScenario('live')}
          disabled={isFetchingLive}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            currentScenario === 'live'
              ? 'bg-blue-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold border-blue-600 dark:border-cyan-400 shadow-sm'
              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Live NEA Data</span>
          {isFetchingLive && <RefreshCw className="w-3 h-3 animate-spin ml-1" />}
        </button>

        <button
          onClick={() => onSelectScenario('unhealthy_west')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            currentScenario === 'unhealthy_west'
              ? 'bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-sm'
              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800'
          }`}
          title="Simulate Transboundary Haze Spike in West/South Singapore (PSI 138)"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Test: Unhealthy Surge (PSI 138)</span>
        </button>

        <button
          onClick={() => onSelectScenario('severe_haze')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            currentScenario === 'severe_haze'
              ? 'bg-red-600 text-white font-bold border-red-600 shadow-sm'
              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-800'
          }`}
          title="Simulate Severe Haze Emergency (PSI 218 Very Unhealthy)"
        >
          <span>Test: Severe Haze (PSI 218)</span>
        </button>

        <button
          onClick={() => onSelectScenario('clean_day')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            currentScenario === 'clean_day'
              ? 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-sm'
              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Test: Good Day (PSI 28)</span>
        </button>

        <button
          onClick={onRefreshLive}
          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Force Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetchingLive ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};
