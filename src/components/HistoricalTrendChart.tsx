import React, { useState } from 'react';
import { HourlyTrendPoint, RegionName } from '../types/airQuality';
import { SINGAPORE_REGIONS } from '../services/airQualityService';

interface HistoricalTrendChartProps {
  trendData: HourlyTrendPoint[];
  selectedRegion: RegionName;
  onSelectRegion: (reg: RegionName) => void;
  unhealthyThreshold: number;
}

export const HistoricalTrendChart: React.FC<HistoricalTrendChartProps> = ({
  trendData,
  selectedRegion,
  onSelectRegion,
  unhealthyThreshold,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!trendData || trendData.length === 0) return null;

  // Chart layout dimensions
  const width = 800;
  const height = 260;
  const padding = { top: 20, right: 30, bottom: 40, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Compute scale max based on highest value or at least 150
  const allValues = trendData.flatMap((d) => [d.national, d.north, d.south, d.east, d.west, d.central]);
  const maxVal = Math.max(140, Math.ceil((Math.max(...allValues) + 15) / 20) * 20);
  const minVal = 0;

  const getX = (index: number) => padding.left + (index / (trendData.length - 1)) * chartW;
  const getY = (val: number) => padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;

  const regionColors: Record<RegionName, string> = {
    national: '#0284C7',
    west: '#F59E0B',
    north: '#06B6D4',
    south: '#EC4899',
    east: '#10B981',
    central: '#8B5CF6',
  };

  const generatePath = (key: RegionName) => {
    return trendData.reduce((acc, point, idx) => {
      const x = getX(idx);
      const y = getY(point[key]);
      return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
    }, '');
  };

  const unhealthyY = getY(unhealthyThreshold);
  const activePoint = hoverIndex !== null ? trendData[hoverIndex] : trendData[trendData.length - 1];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg space-y-4 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            24-Hour Singapore PSI Telemetry
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Hourly progression showing diurnal variations, smoke dispersion, and regional spikes.
          </p>
        </div>

        {/* Region curve legend toggles */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(['national', 'west', 'south', 'central', 'north', 'east'] as const).map((reg) => {
            const isSelected = selectedRegion === reg;
            const color = regionColors[reg];
            return (
              <button
                key={reg}
                onClick={() => onSelectRegion(reg)}
                className={`px-2.5 py-1 rounded-md border text-xs font-mono transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-white text-slate-900 dark:text-white font-bold'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: color }}
                />
                <span className="capitalize">{reg}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Time Series Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Horizontal Grid lines */}
          {[0, 50, 100, 150, 200].filter((v) => v <= maxVal).map((tick) => {
            const y = getY(tick);
            return (
              <g key={`tick-${tick}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-slate-400 dark:fill-slate-500"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Unhealthy Threshold Line */}
          {unhealthyY >= padding.top && (
            <g>
              <line
                x1={padding.left}
                y1={unhealthyY}
                x2={width - padding.right}
                y2={unhealthyY}
                stroke="#F59E0B"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                className="opacity-70"
              />
              <text
                x={width - padding.right}
                y={unhealthyY - 6}
                textAnchor="end"
                className="text-[10px] font-mono fill-amber-600 dark:fill-amber-400 font-bold"
              >
                Unhealthy Threshold (PSI {unhealthyThreshold})
              </text>
            </g>
          )}

          {/* Time Labels on X-axis */}
          {trendData.map((d, idx) => {
            if (idx % 4 !== 0 && idx !== trendData.length - 1) return null;
            const x = getX(idx);
            return (
              <text
                key={`time-${idx}`}
                x={x}
                y={height - 12}
                textAnchor="middle"
                className="text-[10px] font-mono fill-slate-400 dark:fill-slate-500"
              >
                {d.time}
              </text>
            );
          })}

          {/* Regional Curves */}
          {(['national', 'north', 'south', 'east', 'west', 'central'] as const).map((reg) => {
            const isSelected = selectedRegion === reg;
            const color = regionColors[reg];
            return (
              <path
                key={`line-${reg}`}
                d={generatePath(reg)}
                fill="none"
                stroke={color}
                strokeWidth={isSelected ? '3' : '1.3'}
                strokeOpacity={isSelected ? '1' : '0.45'}
                className="transition-all duration-200"
              />
            );
          })}

          {/* Interactive Hover Crosshair */}
          {hoverIndex !== null && (
            <line
              x1={getX(hoverIndex)}
              y1={padding.top}
              x2={getX(hoverIndex)}
              y2={height - padding.bottom}
              stroke="#0284C7"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}

          {/* Invisible interactive hover rects */}
          {trendData.map((_, idx) => {
            const x = getX(idx) - chartW / (trendData.length * 2);
            const w = chartW / trendData.length;
            return (
              <rect
                key={`hover-${idx}`}
                x={Math.max(padding.left, x)}
                y={padding.top}
                width={w}
                height={chartH}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoverIndex(idx)}
              />
            );
          })}
        </svg>

        {/* Floating Monospace HUD for Active Time Probe */}
        {activePoint && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">Timestamp:</span>
              <span className="text-cyan-700 dark:text-cyan-300 font-bold">{activePoint.time} SGT</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-slate-700 dark:text-slate-300">
              <span>
                Nat:{' '}
                <strong className="text-slate-900 dark:text-white tabular-nums">{activePoint.national}</strong>
              </span>
              <span>
                West:{' '}
                <strong className="text-amber-600 dark:text-amber-400 tabular-nums">{activePoint.west}</strong>
              </span>
              <span>
                South:{' '}
                <strong className="text-pink-600 dark:text-pink-400 tabular-nums">{activePoint.south}</strong>
              </span>
              <span>
                Central:{' '}
                <strong className="text-purple-600 dark:text-purple-400 tabular-nums">{activePoint.central}</strong>
              </span>
              <span>
                North:{' '}
                <strong className="text-cyan-600 dark:text-cyan-400 tabular-nums">{activePoint.north}</strong>
              </span>
              <span>
                East:{' '}
                <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">{activePoint.east}</strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
