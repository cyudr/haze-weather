import React from 'react';
import { AirQualityState, RegionName } from '../types/airQuality';
import { getPsiBandColor, getPm25Band, SINGAPORE_REGIONS } from '../services/airQualityService';
import { Compass, ArrowUpRight, ArrowDownRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface MetricsOverviewProps {
  airState: AirQualityState;
  selectedRegion: RegionName;
  onSelectRegion: (reg: RegionName) => void;
  onFocusMap: () => void;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  airState,
  selectedRegion,
  onSelectRegion,
  onFocusMap,
}) => {
  const currentRegionData = airState.regions[selectedRegion];
  const psiColors = getPsiBandColor(currentRegionData.band);
  const pm25Band = getPm25Band(currentRegionData.readings.pm25Hourly);

  return (
    <div className="space-y-6">
      {/* Primary KPI Hero Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: 24-Hour PSI */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg relative overflow-hidden flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-mono tracking-wider uppercase mb-3">
            <span>Official 24-Hr PSI · {currentRegionData.displayName}</span>
            <span className="flex items-center gap-1 text-[11px] font-sans lowercase">
              <span>updated</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {new Date(currentRegionData.updatedAt).toLocaleTimeString('en-SG', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </span>
          </div>

          <div className="flex items-baseline gap-4 my-2">
            <span className="text-5xl font-mono font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {currentRegionData.readings.psi24h}
            </span>
            <div className="space-y-1">
              <span
                className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${psiColors.bg} ${psiColors.text} border ${psiColors.border}`}
              >
                {currentRegionData.band}
              </span>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {currentRegionData.readings.psi24h <= 50
                  ? 'Safe for normal activities'
                  : currentRegionData.readings.psi24h <= 100
                  ? 'Acceptable air quality'
                  : currentRegionData.readings.psi24h <= 200
                  ? 'Unhealthy · Reduce exertion'
                  : 'Avoid outdoor activities'}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 font-mono">
              <span>1H Trend:</span>
              {currentRegionData.delta1h >= 0 ? (
                <span className="flex items-center text-amber-600 dark:text-amber-400 font-medium">
                  <ArrowUpRight className="w-3.5 h-3.5" />+{currentRegionData.delta1h} PSI
                </span>
              ) : (
                <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  {currentRegionData.delta1h} PSI
                </span>
              )}
            </div>
            <button
              onClick={onFocusMap}
              className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
            >
              Inspect on Map &rarr;
            </button>
          </div>
        </div>

        {/* Card 2: 1-Hour PM2.5 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg relative overflow-hidden flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-mono tracking-wider uppercase mb-3">
            <span>1-Hr PM2.5 Rapid Indicator</span>
            <span className="text-cyan-600 dark:text-cyan-400 text-[11px] font-sans font-medium">Outdoor Decision</span>
          </div>

          <div className="flex items-baseline gap-3 my-2">
            <span className="text-5xl font-mono font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {currentRegionData.readings.pm25Hourly}
            </span>
            <span className="text-sm font-mono text-slate-500 dark:text-slate-400">µg/m³</span>
            <div className="ml-auto">
              <span
                className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${
                  currentRegionData.readings.pm25Hourly <= 55
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                    : currentRegionData.readings.pm25Hourly <= 150
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/40'
                    : 'bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/50'
                }`}
              >
                {pm25Band.band}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
            <span>{pm25Band.description}</span>
          </div>
        </div>

        {/* Card 3: Meteorological Wind */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg relative overflow-hidden flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-mono tracking-wider uppercase mb-3">
            <span>Prevailing Dispersion Wind</span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-sans">MSS Radar</span>
          </div>

          <div className="flex items-center justify-between my-2">
            <div>
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
                  {airState.windDirectionDegrees}° SW
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                Speed: <span className="text-slate-800 dark:text-slate-200 font-semibold">{airState.windSpeedKnots} knots</span> (~{Math.round(airState.windSpeedKnots * 1.852)} km/h)
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Monsoon Season</div>
              <div className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">Southwest Monsoon</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Haze Risk: Elevated</div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 truncate">
            {airState.generalAdvisory}
          </div>
        </div>
      </div>

      {/* Sector Comparison Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Singapore Monitoring Stations by Sector
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select any sector to inspect granular microclimate telemetry and key residential areas.
            </p>
          </div>
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Source: <span className="text-slate-700 dark:text-slate-300 font-medium">National Environment Agency (NEA)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {(['national', 'north', 'south', 'east', 'west', 'central'] as const).map((reg) => {
            const data = airState.regions[reg];
            const isSelected = selectedRegion === reg;
            const isAlert = data.readings.psi24h >= 101;

            return (
              <button
                key={reg}
                onClick={() => onSelectRegion(reg)}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-slate-800/90 border-blue-500 dark:border-cyan-400 shadow-sm ring-1 ring-blue-500/50 dark:ring-cyan-400/50'
                    : isAlert
                    ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/40 hover:bg-amber-100/60'
                    : 'bg-slate-50/70 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
                    {data.displayName}
                  </span>
                  {isAlert ? (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                </div>

                <div className="flex items-baseline gap-1.5 my-1">
                  <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                    {data.readings.psi24h}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">PSI</span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-800/80">
                  <span className="text-slate-500 dark:text-slate-400">PM2.5:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold tabular-nums">
                    {data.readings.pm25Hourly}
                  </span>
                </div>

                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-1">
                  {SINGAPORE_REGIONS[reg].towns[0]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Granular 6-Pollutant Breakdown Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg transition-colors">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Full Pollutant Diagnostics ({currentRegionData.displayName})
            </h3>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Multi-parameter sub-indices calibrated to official Singapore ambient air quality standards.
            </div>
          </div>
          <span className="text-xs font-mono text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 px-2.5 py-1 rounded border border-cyan-200 dark:border-cyan-500/20 font-medium">
            6 Parameters Active
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3">
            <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">PM2.5 (24-hr)</div>
            <div className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
              {currentRegionData.readings.pm2524h} <span className="text-xs text-slate-500 font-normal">µg/m³</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Fine Respirable</div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3">
            <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">PM10 (24-hr)</div>
            <div className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
              {currentRegionData.readings.pm1024h} <span className="text-xs text-slate-500 font-normal">µg/m³</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Coarse Particulate</div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3">
            <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Ozone O₃ (8-hr)</div>
            <div className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
              {currentRegionData.readings.o38h} <span className="text-xs text-slate-500 font-normal">µg/m³</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Photochemical</div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3">
            <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">NO₂ (1-hr max)</div>
            <div className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
              {currentRegionData.readings.no21h} <span className="text-xs text-slate-500 font-normal">µg/m³</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Combustion/Traffic</div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3">
            <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">SO₂ (24-hr)</div>
            <div className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
              {currentRegionData.readings.so224h} <span className="text-xs text-slate-500 font-normal">µg/m³</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Sulphur Dioxide</div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3">
            <div className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">CO (8-hr max)</div>
            <div className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
              {currentRegionData.readings.co8h} <span className="text-xs text-slate-500 font-normal">mg/m³</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Carbon Monoxide</div>
          </div>
        </div>
      </div>
    </div>
  );
};
