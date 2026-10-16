import React, { useState } from 'react';
import { AirQualityState, RegionName } from '../types/airQuality';
import { getPsiBandColor, getPm25Band, SINGAPORE_REGIONS } from '../services/airQualityService';
import { Eye, Layers, Wind, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';

interface SingaporeMapProps {
  airState: AirQualityState;
  selectedRegion: RegionName;
  onSelectRegion: (region: RegionName) => void;
  metricType: 'psi' | 'pm25';
  onMetricChange: (metric: 'psi' | 'pm25') => void;
  unhealthyThreshold: number;
}

export const SingaporeMap: React.FC<SingaporeMapProps> = ({
  airState,
  selectedRegion,
  onSelectRegion,
  metricType,
  onMetricChange,
  unhealthyThreshold,
}) => {
  const [showHazePlume, setShowHazePlume] = useState<boolean>(true);
  const [showWindVectors, setShowWindVectors] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hoveredRegion, setHoveredRegion] = useState<RegionName | null>(null);

  // Region specific SVG path coordinates for Singapore Mainland & Island Sectors
  // Designed in 960 x 580 viewBox calibrated to Singapore's geographic outline
  const regionPaths: Record<'west' | 'north' | 'central' | 'east' | 'south', string> = {
    west: 'M 140,240 C 180,210 230,195 290,190 L 320,270 L 320,380 L 260,420 C 220,430 160,410 110,415 C 60,400 40,360 50,330 C 65,290 100,260 140,240 Z',
    north: 'M 290,190 C 340,150 430,130 520,130 C 580,130 630,150 670,175 L 610,250 L 460,255 L 320,270 Z',
    central: 'M 320,270 L 460,255 L 610,250 L 590,340 L 490,370 L 320,380 Z',
    east: 'M 670,175 C 720,185 790,205 850,240 C 890,270 890,310 850,340 C 800,380 730,385 670,390 L 590,340 L 610,250 Z',
    south: 'M 320,380 L 490,370 L 590,340 L 670,390 C 630,425 560,440 480,440 C 400,440 330,430 260,420 Z',
  };

  // Station coordinate anchors on map viewBox (x, y)
  const stationLocations: Record<RegionName, { x: number; y: number; code: string; name: string }> = {
    national: { x: 480, y: 280, code: 'SG-NAT', name: 'National Baseline' },
    north: { x: 480, y: 185, code: 'SG-N01', name: 'Woodlands Station' },
    west: { x: 195, y: 320, code: 'SG-W01', name: 'Jurong West Station' },
    central: { x: 470, y: 310, code: 'SG-C01', name: 'Toa Payoh Station' },
    east: { x: 740, y: 285, code: 'SG-E01', name: 'Tampines Station' },
    south: { x: 460, y: 410, code: 'SG-S01', name: 'Telok Blangah Station' },
  };

  const getRegionFill = (regionKey: 'west' | 'north' | 'central' | 'east' | 'south') => {
    const data = airState.regions[regionKey];
    const val = metricType === 'psi' ? data.readings.psi24h : data.readings.pm25Hourly;
    const isSelected = selectedRegion === regionKey;
    const isHovered = hoveredRegion === regionKey;

    if (metricType === 'psi') {
      const colors = getPsiBandColor(data.band);
      if (val >= 201) return isSelected || isHovered ? '#DC2626' : 'rgba(220, 38, 38, 0.45)';
      if (val >= 101) return isSelected || isHovered ? '#D97706' : 'rgba(217, 119, 6, 0.42)';
      if (val >= 51) return isSelected || isHovered ? '#0284C7' : 'rgba(2, 132, 199, 0.35)';
      return isSelected || isHovered ? '#059669' : 'rgba(5, 150, 105, 0.30)';
    } else {
      const pm = getPm25Band(val);
      if (val > 150) return isSelected || isHovered ? '#DC2626' : 'rgba(220, 38, 38, 0.45)';
      if (val > 55) return isSelected || isHovered ? '#D97706' : 'rgba(217, 119, 6, 0.42)';
      return isSelected || isHovered ? '#059669' : 'rgba(5, 150, 105, 0.30)';
    }
  };

  const activeData = airState.regions[selectedRegion];
  const activeVal = metricType === 'psi' ? activeData.readings.psi24h : activeData.readings.pm25Hourly;
  const isHighAlert = activeVal >= (metricType === 'psi' ? unhealthyThreshold : 56);

  return (
    <div className="relative w-full rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden flex flex-col">
      {/* Top Map HUD Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-slate-800 bg-slate-900/90 backdrop-blur z-20">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-400 font-mono">
            Map Mode
          </span>
          <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => onMetricChange('psi')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                metricType === 'psi'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              24-Hr PSI
            </button>
            <button
              onClick={() => onMetricChange('pm25')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                metricType === 'pm25'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1-Hr PM2.5 (Rapid)
            </button>
          </div>
        </div>

        {/* Map Layers Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHazePlume(!showHazePlume)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors whitespace-nowrap ${
              showHazePlume
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Transboundary Haze Smoke Dispersion Overlay"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Haze Plume</span>
          </button>

          <button
            onClick={() => setShowWindVectors(!showWindVectors)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors whitespace-nowrap ${
              showWindVectors
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Prevailing Monsoon Wind Streamlines"
          >
            <Wind className="w-3.5 h-3.5" />
            <span>SW Monsoon Wind</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.6, z + 0.15))}
              className="p-1 text-slate-400 hover:text-slate-100 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.85, z - 0.15))}
              className="p-1 text-slate-400 hover:text-slate-100 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 text-slate-400 hover:text-slate-100 rounded"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main SVG Map Canvas */}
      <div className="relative w-full aspect-[16/10] min-h-[380px] max-h-[560px] bg-slate-950 overflow-hidden flex items-center justify-center">
        {/* Ambient Sea Gradient & Grid lines */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(6,182,212,0.06),rgba(2,6,23,0.95))]" />
        
        {/* Subtle Latitude/Longitude Coordinate Grid */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <svg className="w-full h-full">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-cyan-500" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Scaled Map Container */}
        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-300"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <svg
            viewBox="0 0 960 540"
            className="w-full h-full max-w-[960px] max-h-[540px] drop-shadow-2xl select-none"
          >
            <defs>
              {/* Animated Transboundary Smoke Plume Gradient */}
              <radialGradient id="smokePlume" cx="20%" cy="80%" r="90%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
                <stop offset="40%" stopColor="#D97706" stopOpacity="0.25" />
                <stop offset="75%" stopColor="#B45309" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>

              {/* Glowing filter for high alert station rings */}
              <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Straits Water Labeling */}
            <text x="480" y="70" textAnchor="middle" className="text-[11px] font-mono fill-slate-700 font-medium tracking-widest">
              STRAITS OF JOHOR (MALAYSIA)
            </text>
            <text x="480" y="500" textAnchor="middle" className="text-[11px] font-mono fill-slate-700 font-medium tracking-widest">
              SINGAPORE STRAIT (INDONESIA / RIAU ARCHIPELAGO)
            </text>

            {/* Surrounding Geography Outlines (Context) */}
            {/* Johor Mainland Coast (North) */}
            <path
              d="M 60,110 C 200,90 380,80 500,85 C 650,90 780,120 900,100"
              fill="none"
              stroke="#1E293B"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            {/* Singapore Offshore Islands */}
            {/* Jurong Island */}
            <path
              d="M 170,445 C 190,440 220,445 235,465 C 230,480 195,490 175,480 C 160,470 155,455 170,445 Z"
              fill="#1E293B"
              stroke="#334155"
              strokeWidth="1"
              className="cursor-pointer hover:fill-slate-700 transition-colors"
              onClick={() => onSelectRegion('west')}
            >
              <title>Jurong Island (Industrial & Petrochemical Hub)</title>
            </path>
            <text x="195" y="470" className="text-[9px] font-mono fill-slate-500 font-semibold pointer-events-none">
              JURONG IS.
            </text>

            {/* Sentosa Island */}
            <path
              d="M 440,460 C 470,455 510,460 520,472 C 500,482 460,480 435,472 Z"
              fill="#1E293B"
              stroke="#334155"
              strokeWidth="1"
              className="cursor-pointer hover:fill-slate-700 transition-colors"
              onClick={() => onSelectRegion('south')}
            >
              <title>Sentosa Island</title>
            </path>
            <text x="470" y="473" className="text-[9px] font-mono fill-slate-500 font-semibold pointer-events-none">
              SENTOSA
            </text>

            {/* Pulau Ubin */}
            <path
              d="M 720,160 C 745,155 770,165 775,175 C 760,185 730,180 715,170 Z"
              fill="#1E293B"
              stroke="#334155"
              strokeWidth="1"
              className="cursor-pointer hover:fill-slate-700 transition-colors"
              onClick={() => onSelectRegion('east')}
            >
              <title>Pulau Ubin</title>
            </path>
            <text x="735" y="172" className="text-[8px] font-mono fill-slate-500 font-semibold pointer-events-none">
              P. UBIN
            </text>

            {/* Pulau Tekong */}
            <path
              d="M 800,165 C 830,160 855,175 860,195 C 840,210 810,205 795,185 Z"
              fill="#1E293B"
              stroke="#334155"
              strokeWidth="1"
              className="cursor-pointer hover:fill-slate-700 transition-colors"
              onClick={() => onSelectRegion('east')}
            >
              <title>Pulau Tekong</title>
            </path>
            <text x="820" y="188" className="text-[8px] font-mono fill-slate-500 font-semibold pointer-events-none">
              P. TEKONG
            </text>

            {/* Five Official Singapore Regions (Mainland Polygons) */}
            {(['west', 'north', 'central', 'east', 'south'] as const).map((regionKey) => {
              const isSelected = selectedRegion === regionKey;
              const isHovered = hoveredRegion === regionKey;
              const fill = getRegionFill(regionKey);
              const data = airState.regions[regionKey];
              const val = metricType === 'psi' ? data.readings.psi24h : data.readings.pm25Hourly;

              return (
                <g key={regionKey} className="transition-all duration-200">
                  <path
                    d={regionPaths[regionKey]}
                    fill={fill}
                    stroke={isSelected ? '#38BDF8' : isHovered ? '#0EA5E9' : '#334155'}
                    strokeWidth={isSelected ? '2.5' : isHovered ? '2' : '1.2'}
                    className="cursor-pointer transition-colors duration-200 hover:brightness-125"
                    onClick={() => onSelectRegion(regionKey)}
                    onMouseEnter={() => setHoveredRegion(regionKey)}
                    onMouseLeave={() => setHoveredRegion(null)}
                  />
                  {/* Region Label on Map */}
                  <g pointerEvents="none" className="select-none">
                    <text
                      x={stationLocations[regionKey].x}
                      y={stationLocations[regionKey].y - 24}
                      textAnchor="middle"
                      className="text-xs font-bold fill-slate-200 drop-shadow"
                    >
                      {regionKey.toUpperCase()}
                    </text>
                    <text
                      x={stationLocations[regionKey].x}
                      y={stationLocations[regionKey].y - 10}
                      textAnchor="middle"
                      className="text-[11px] font-mono font-semibold fill-cyan-300 drop-shadow"
                    >
                      {metricType === 'psi' ? `PSI ${val}` : `${val} µg/m³`}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Optional Transboundary Haze Smoke Plume Simulation Layer */}
            {showHazePlume && (
              <g className="pointer-events-none opacity-80 mix-blend-screen">
                <ellipse
                  cx="240"
                  cy="360"
                  rx="260"
                  ry="170"
                  transform="rotate(-25 240 360)"
                  fill="url(#smokePlume)"
                />
                <ellipse
                  cx="480"
                  cy="320"
                  rx="200"
                  ry="120"
                  transform="rotate(-20 480 320)"
                  fill="url(#smokePlume)"
                  opacity="0.6"
                />
              </g>
            )}

            {/* Optional Prevailing Wind Streamlines (Southwest Monsoon) */}
            {showWindVectors && (
              <g className="pointer-events-none opacity-50 stroke-cyan-400 stroke-1" strokeDasharray="6 4">
                <line x1="80" y1="480" x2="220" y2="360" markerEnd="url(#arrow)" />
                <line x1="260" y1="510" x2="400" y2="390" markerEnd="url(#arrow)" />
                <line x1="420" y1="520" x2="560" y2="400" markerEnd="url(#arrow)" />
                <line x1="600" y1="490" x2="740" y2="370" markerEnd="url(#arrow)" />
              </g>
            )}

            {/* Monitoring Station Nodes */}
            {(['north', 'west', 'central', 'east', 'south'] as const).map((regionKey) => {
              const loc = stationLocations[regionKey];
              const isSelected = selectedRegion === regionKey;
              const data = airState.regions[regionKey];
              const val = metricType === 'psi' ? data.readings.psi24h : data.readings.pm25Hourly;
              const isAlert = val >= (metricType === 'psi' ? unhealthyThreshold : 56);

              return (
                <g
                  key={`station-${regionKey}`}
                  transform={`translate(${loc.x}, ${loc.y})`}
                  className="cursor-pointer"
                  onClick={() => onSelectRegion(regionKey)}
                >
                  {/* Pulsing ring if in unhealthy alert band */}
                  {isAlert && (
                    <circle
                      r="16"
                      className="fill-amber-500/20 stroke-amber-400 stroke-2 animate-ping"
                    />
                  )}

                  {/* Station Marker Outer Ring */}
                  <circle
                    r={isSelected ? '10' : '7'}
                    className={`transition-all duration-200 ${
                      isSelected
                        ? 'fill-cyan-400 stroke-white stroke-2 shadow-lg'
                        : isAlert
                        ? 'fill-amber-500 stroke-amber-200 stroke-2'
                        : 'fill-slate-800 stroke-cyan-400 stroke-1.5'
                    }`}
                  />
                  {/* Station Marker Inner Core */}
                  <circle
                    r={isSelected ? '4' : '2.5'}
                    className={isSelected ? 'fill-slate-950' : 'fill-white'}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Floating Quick Legend (Bottom Left) */}
        <div className="absolute bottom-3 left-3 bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-2 backdrop-blur text-[11px] font-mono text-slate-400 space-y-1 select-none pointer-events-none z-10">
          <div className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
            {metricType === 'psi' ? 'NEA 24-Hr PSI Scale' : '1-Hr PM2.5 (µg/m³)'}
          </div>
          {metricType === 'psi' ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> 0–50
              </span>
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" /> 51–100
              </span>
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> 101–200
              </span>
              <span className="flex items-center gap-1 text-orange-500 font-semibold">
                <span className="w-2 h-2 rounded-full bg-orange-600 inline-block" /> 201+
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> ≤55 Normal
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> 56–150 Elev.
              </span>
              <span className="flex items-center gap-1 text-orange-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> 151+ High
              </span>
            </div>
          )}
        </div>

        {/* Selected Region Telemetry Float HUD (Top Right) */}
        <div className="absolute top-3 right-3 bg-slate-950/95 border border-slate-800 rounded-xl p-3 shadow-xl backdrop-blur max-w-xs z-10">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2 mb-2">
            <div>
              <div className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                Active Station Focus
              </div>
              <div className="text-sm font-bold text-slate-100">
                {activeData.displayName} Sector
              </div>
            </div>
            {isHighAlert ? (
              <div className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Alert</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Safe</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <div className="text-[10px] text-slate-400">24-HR PSI</div>
              <div className="text-lg font-bold text-slate-100 tabular-nums">
                {activeData.readings.psi24h}
              </div>
              <div className="text-[10px] text-slate-400">{activeData.band}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">1-HR PM2.5</div>
              <div className="text-lg font-bold text-slate-100 tabular-nums">
                {activeData.readings.pm25Hourly}{' '}
                <span className="text-[10px] font-normal text-slate-400">µg/m³</span>
              </div>
              <div className="text-[10px] text-slate-400">
                {getPm25Band(activeData.readings.pm25Hourly).band}
              </div>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Key Areas:</span>
            <span className="text-slate-300 font-medium truncate max-w-[170px]" title={SINGAPORE_REGIONS[selectedRegion].towns.join(', ')}>
              {SINGAPORE_REGIONS[selectedRegion].towns.slice(0, 3).join(', ')}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Region Quick Bar */}
      <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
        <span className="text-xs font-mono uppercase text-slate-400 whitespace-nowrap hidden sm:inline">
          Sectors:
        </span>
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(['national', 'north', 'south', 'east', 'west', 'central'] as const).map((reg) => {
            const data = airState.regions[reg];
            const isSelected = selectedRegion === reg;
            const val = metricType === 'psi' ? data.readings.psi24h : data.readings.pm25Hourly;
            const isAlert = val >= (metricType === 'psi' ? unhealthyThreshold : 56);

            return (
              <button
                key={reg}
                onClick={() => onSelectRegion(reg)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-400 text-white shadow-sm'
                    : isAlert
                    ? 'bg-amber-950/40 border-amber-700/60 text-amber-200 hover:bg-amber-900/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span>{reg.charAt(0).toUpperCase() + reg.slice(1)}</span>
                <span className="font-mono tabular-nums font-semibold">
                  {val}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
