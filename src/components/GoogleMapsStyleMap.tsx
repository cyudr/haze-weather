import React, { useState, useRef, useEffect } from 'react';
import { AirQualityState, RegionName } from '../types/airQuality';
import { getPsiBandColor, getPm25Band, SINGAPORE_REGIONS } from '../services/airQualityService';
import {
  Plus,
  Minus,
  Maximize2,
  Compass,
  Layers,
  MapPin,
  X,
  ExternalLink,
  Navigation,
  Wind,
  ShieldAlert,
  Search,
} from 'lucide-react';

interface GoogleMapsStyleMapProps {
  airState: AirQualityState;
  selectedRegion: RegionName;
  onSelectRegion: (region: RegionName) => void;
  metricType: 'psi' | 'pm25';
  onMetricChange: (metric: 'psi' | 'pm25') => void;
  unhealthyThreshold: number;
  theme: 'dark' | 'light';
}

export type GoogleMapType = 'roadmap' | 'satellite' | 'terrain' | 'dark';

export const GoogleMapsStyleMap: React.FC<GoogleMapsStyleMapProps> = ({
  airState,
  selectedRegion,
  onSelectRegion,
  metricType,
  onMetricChange,
  unhealthyThreshold,
  theme,
}) => {
  const [mapType, setMapType] = useState<GoogleMapType>(theme === 'dark' ? 'dark' : 'roadmap');
  const [zoom, setZoom] = useState<number>(1.1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeInfoWindow, setActiveInfoWindow] = useState<RegionName | null>(selectedRegion);
  const [showHazeLayer, setShowHazeLayer] = useState<boolean>(true);
  const [showTrafficLayer, setShowTrafficLayer] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [streetViewActive, setStreetViewActive] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync default map style if theme changes and user hasn't explicitly set satellite
  useEffect(() => {
    if (mapType !== 'satellite' && mapType !== 'terrain') {
      setMapType(theme === 'dark' ? 'dark' : 'roadmap');
    }
  }, [theme]);

  // Coordinate positions of 5 stations + National in 1000 x 600 coordinate box
  const stationCoords: Record<
    RegionName,
    { x: number; y: number; code: string; stationName: string; landmark: string; lat: number; lng: number }
  > = {
    national: {
      x: 500,
      y: 300,
      code: 'SG-NAT',
      stationName: 'National Air Monitoring Base',
      landmark: 'National Environment Agency HQ, Singapore',
      lat: 1.3521,
      lng: 103.8198,
    },
    north: {
      x: 505,
      y: 195,
      code: 'SG-N01',
      stationName: 'Woodlands Regional Station',
      landmark: 'Woodlands Ave 9 / Causeway Checkpoint Area',
      lat: 1.418,
      lng: 103.82,
    },
    south: {
      x: 480,
      y: 415,
      code: 'SG-S01',
      stationName: 'Telok Blangah South Station',
      landmark: 'Henderson Waves / HarbourFront / Sentosa Basin',
      lat: 1.2959,
      lng: 103.82,
    },
    east: {
      x: 770,
      y: 295,
      code: 'SG-E01',
      stationName: 'Tampines East Station',
      landmark: 'Tampines Hub / Changi Airport Sector',
      lat: 1.3574,
      lng: 103.94,
    },
    west: {
      x: 210,
      y: 330,
      code: 'SG-W01',
      stationName: 'Jurong West Regional Station',
      landmark: 'Jurong Lake District / Tuas Gateway',
      lat: 1.3574,
      lng: 103.7,
    },
    central: {
      x: 495,
      y: 315,
      code: 'SG-C01',
      stationName: 'Toa Payoh Central Station',
      landmark: 'Bishan-Ang Mo Kio Park / Orchard Perimeter',
      lat: 1.3574,
      lng: 103.82,
    },
  };

  // Drag pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetView = () => {
    setZoom(1.1);
    setPan({ x: 0, y: 0 });
  };

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.75, +(z - 0.25).toFixed(2)));

  // Filter stations based on search query
  const filteredRegionKey = (Object.keys(stationCoords) as RegionName[]).find((k) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase();
    const st = stationCoords[k];
    return (
      st.stationName.toLowerCase().includes(q) ||
      st.landmark.toLowerCase().includes(q) ||
      k.toLowerCase().includes(q) ||
      SINGAPORE_REGIONS[k].towns.some((t) => t.toLowerCase().includes(q))
    );
  });

  const jumpToRegion = (reg: RegionName) => {
    onSelectRegion(reg);
    setActiveInfoWindow(reg);
    const coords = stationCoords[reg];
    // Center pan on station
    setPan({
      x: (500 - coords.x) * (zoom - 0.2),
      y: (300 - coords.y) * (zoom - 0.2),
    });
  };

  // Google Maps color palette constants based on mapType
  const getThemePalette = () => {
    switch (mapType) {
      case 'satellite':
        return {
          water: '#0a1d37',
          waterBorder: '#16385f',
          land: '#1f3424',
          landStroke: '#2d4e34',
          reserve: '#132817',
          expressway: '#f9bc02',
          arterial: '#40604b',
          street: '#2c4735',
          island: '#182b1d',
          grid: 'rgba(255,255,255,0.08)',
          labelHalo: '#0a1d37',
          labelText: '#e2e8f0',
          hudBg: 'bg-slate-900/90 text-white border-slate-700',
        };
      case 'terrain':
        return {
          water: '#a5bfdd',
          waterBorder: '#84a6cc',
          land: '#e8ece4',
          landStroke: '#d0d8c9',
          reserve: '#b8d6b0',
          expressway: '#f7c873',
          arterial: '#ffffff',
          street: '#fdfdfd',
          island: '#dfe7db',
          grid: 'rgba(0,0,0,0.06)',
          labelHalo: '#ffffff',
          labelText: '#374151',
          hudBg: 'bg-white/95 text-slate-900 border-slate-200',
        };
      case 'dark':
        return {
          water: '#17263c',
          waterBorder: '#233857',
          land: '#242f3e',
          landStroke: '#2c3c52',
          reserve: '#1b4038',
          expressway: '#d59563',
          arterial: '#38414e',
          street: '#2e3745',
          island: '#202b39',
          grid: 'rgba(255,255,255,0.06)',
          labelHalo: '#242f3e',
          labelText: '#d5dbe5',
          hudBg: 'bg-slate-900/95 text-white border-slate-700',
        };
      case 'roadmap':
      default:
        return {
          water: '#aad3df',
          waterBorder: '#8bbdcd',
          land: '#f5f5f5',
          landStroke: '#e0e0e0',
          reserve: '#c5e8c5',
          expressway: '#fde293',
          arterial: '#ffffff',
          street: '#ffffff',
          island: '#ebeae6',
          grid: 'rgba(0,0,0,0.05)',
          labelHalo: '#ffffff',
          labelText: '#3c4043',
          hudBg: 'bg-white/95 text-slate-900 border-slate-200',
        };
    }
  };

  const p = getThemePalette();

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-800 select-none bg-slate-100 dark:bg-slate-950 font-sans"
      style={{ height: '580px' }}
    >
      {/* Google Maps Search Bar & Metric Switcher Top Row */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Google Maps Search Box */}
        <div className="pointer-events-auto flex items-center bg-white dark:bg-slate-900 shadow-md rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search town, station, e.g. Woodlands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search match popup if typed */}
        {filteredRegionKey && (
          <div className="pointer-events-auto absolute top-12 left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg p-2 text-xs w-72 z-40">
            <button
              onClick={() => {
                jumpToRegion(filteredRegionKey);
                setSearchQuery('');
              }}
              className="w-full text-left p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-100">
                  {stationCoords[filteredRegionKey].stationName}
                </div>
                <div className="text-[11px] text-slate-500">
                  {stationCoords[filteredRegionKey].landmark}
                </div>
              </div>
              <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                PSI {airState.regions[filteredRegionKey].readings.psi24h}
              </span>
            </button>
          </div>
        )}

        {/* Map Type Segmented Control (Google Maps Style) */}
        <div className="pointer-events-auto flex items-center bg-white dark:bg-slate-900 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-0.5 ml-auto text-xs font-medium">
          <button
            onClick={() => setMapType('roadmap')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              mapType === 'roadmap'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setMapType('satellite')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              mapType === 'satellite'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setMapType('terrain')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              mapType === 'terrain'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Terrain
          </button>
          <button
            onClick={() => setMapType('dark')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              mapType === 'dark'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Night
          </button>
        </div>
      </div>

      {/* Floating Layer Controls (Top Left below search) */}
      <div className="absolute top-16 left-3 z-30 flex flex-col gap-1.5 pointer-events-auto">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-1 flex flex-col gap-1 text-xs">
          <button
            onClick={() => setShowHazeLayer(!showHazeLayer)}
            className={`px-2.5 py-1.5 rounded text-left flex items-center gap-1.5 transition-colors ${
              showHazeLayer
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Toggle Transboundary Haze Smoke Plume Layer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Haze Plume</span>
          </button>

          <button
            onClick={() => setShowTrafficLayer(!showTrafficLayer)}
            className={`px-2.5 py-1.5 rounded text-left flex items-center gap-1.5 transition-colors ${
              showTrafficLayer
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Toggle Singapore Major Expressways (PIE, AYE, CTE)"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Expressways</span>
          </button>

          <div className="pt-1 mt-1 border-t border-slate-200 dark:border-slate-700 flex items-center gap-1">
            <button
              onClick={() => onMetricChange('psi')}
              className={`flex-1 px-1.5 py-1 rounded text-center text-[10px] font-mono font-bold ${
                metricType === 'psi'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              PSI
            </button>
            <button
              onClick={() => onMetricChange('pm25')}
              className={`flex-1 px-1.5 py-1 rounded text-center text-[10px] font-mono font-bold ${
                metricType === 'pm25'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              PM2.5
            </button>
          </div>
        </div>
      </div>

      {/* Main Draggable Map Canvas */}
      <div
        className={`w-full h-full cursor-grab active:cursor-grabbing overflow-hidden relative ${
          mapType === 'dark' ? 'bg-[#17263c]' : mapType === 'satellite' ? 'bg-[#0a1d37]' : 'bg-[#aad3df]'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-75 origin-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <svg
            viewBox="0 0 1000 600"
            className="w-full h-full max-w-[1000px] max-h-[600px] select-none"
          >
            <defs>
              {/* Animated Haze Plume Gradient */}
              <radialGradient id="gmapHaze" cx="25%" cy="75%" r="80%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.48" />
                <stop offset="35%" stopColor="#D97706" stopOpacity="0.30" />
                <stop offset="70%" stopColor="#B45309" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>

              {/* Marker Drop Shadow */}
              <filter id="pinShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.35" />
              </filter>
            </defs>

            {/* Ocean / Straits Water Fill is handled by SVG background */}

            {/* Latitude / Longitude Google Grid lines */}
            <g stroke={p.grid} strokeWidth="1">
              <line x1="0" y1="150" x2="1000" y2="150" strokeDasharray="3 3" />
              <line x1="0" y1="300" x2="1000" y2="300" strokeDasharray="3 3" />
              <line x1="0" y1="450" x2="1000" y2="450" strokeDasharray="3 3" />
              <line x1="250" y1="0" x2="250" y2="600" strokeDasharray="3 3" />
              <line x1="500" y1="0" x2="500" y2="600" strokeDasharray="3 3" />
              <line x1="750" y1="0" x2="750" y2="600" strokeDasharray="3 3" />
            </g>

            {/* Johor Coastline (Malaysia Context) */}
            <path
              d="M 40,110 C 180,95 340,75 510,80 C 670,85 810,120 960,95 L 960,0 L 40,0 Z"
              fill={p.island}
              stroke={p.landStroke}
              strokeWidth="1.5"
            />
            <text x="500" y="55" textAnchor="middle" fill={p.labelText} className="text-[10px] font-sans font-bold tracking-widest opacity-60">
              JOHOR BAHRU (MALAYSIA)
            </text>

            {/* Causeway & Second Link to Malaysia */}
            <line x1="490" y1="85" x2="495" y2="140" stroke="#f59e0b" strokeWidth="3" strokeDasharray="3 1" />
            <line x1="85" y1="105" x2="95" y2="280" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="3 1" />

            {/* MAINLAND SINGAPORE LANDMASS */}
            <path
              d="M 120,250 
                 C 170,200 240,175 320,165 
                 C 380,140 450,130 540,130 
                 C 620,130 670,150 710,170 
                 C 770,180 830,200 890,230 
                 C 930,260 930,300 890,340 
                 C 830,385 750,395 680,400 
                 C 630,430 550,445 460,445 
                 C 370,445 300,435 240,420 
                 C 170,410 110,400 65,370 
                 C 45,340 50,310 75,280 
                 C 90,265 105,255 120,250 Z"
              fill={p.land}
              stroke={p.landStroke}
              strokeWidth="2"
            />

            {/* Singapore Nature Reserves & Parks (Google Maps Green #c5e8c5) */}
            {/* Central Catchment Nature Reserve & MacRitchie */}
            <path
              d="M 430,220 C 470,210 520,215 540,240 C 530,270 480,290 440,280 C 420,260 415,235 430,220 Z"
              fill={p.reserve}
              stroke={p.landStroke}
              strokeWidth="1"
            />
            {/* Bukit Timah Nature Reserve */}
            <circle cx="395" cy="290" r="22" fill={p.reserve} />
            {/* Western Water Catchment / Lim Chu Kang green */}
            <path
              d="M 180,240 C 230,220 250,260 220,300 C 180,310 160,280 180,240 Z"
              fill={p.reserve}
            />

            {/* Singapore Reservoirs (Water Blue) */}
            <ellipse cx="490" cy="250" rx="20" ry="9" fill={p.water} stroke={p.waterBorder} strokeWidth="0.8" />
            <ellipse cx="450" cy="270" rx="24" ry="7" fill={p.water} stroke={p.waterBorder} strokeWidth="0.8" />
            <ellipse cx="500" cy="400" rx="14" ry="8" fill={p.water} stroke={p.waterBorder} strokeWidth="0.8" />
            <ellipse cx="230" cy="340" rx="15" ry="9" fill={p.water} stroke={p.waterBorder} strokeWidth="0.8" />

            {/* Offshore Islands */}
            {/* Jurong Island */}
            <path
              d="M 160,430 C 190,420 225,430 240,455 C 235,475 195,485 170,475 C 150,460 145,445 160,430 Z"
              fill={p.island}
              stroke={p.landStroke}
              strokeWidth="1.2"
              className="cursor-pointer hover:brightness-105"
              onClick={() => jumpToRegion('west')}
            />
            <text x="185" y="460" className="text-[9px] font-sans font-bold fill-slate-500 pointer-events-none">
              JURONG ISL.
            </text>

            {/* Sentosa Island */}
            <path
              d="M 450,455 C 485,450 525,455 535,468 C 510,478 470,476 445,468 Z"
              fill={p.island}
              stroke={p.landStroke}
              strokeWidth="1.2"
              className="cursor-pointer hover:brightness-105"
              onClick={() => jumpToRegion('south')}
            />
            <text x="475" y="468" className="text-[9px] font-sans font-bold fill-slate-500 pointer-events-none">
              SENTOSA
            </text>

            {/* Pulau Ubin & Pulau Tekong */}
            <path
              d="M 740,150 C 770,145 795,155 800,165 C 785,175 750,172 735,160 Z"
              fill={p.reserve}
              stroke={p.landStroke}
              strokeWidth="1"
            />
            <path
              d="M 820,155 C 855,150 880,165 885,185 C 865,200 835,195 815,175 Z"
              fill={p.island}
              stroke={p.landStroke}
              strokeWidth="1"
            />

            {/* Changi Airport Runways (02L / 02C / 20R) */}
            <g opacity="0.6">
              <line x1="880" y1="230" x2="895" y2="300" stroke={p.labelText} strokeWidth="3" />
              <line x1="895" y1="235" x2="910" y2="305" stroke={p.labelText} strokeWidth="3" />
              <text x="895" y="320" textAnchor="middle" fill={p.labelText} className="text-[8px] font-sans font-semibold">
                CHANGI AIRPORT (SIN)
              </text>
            </g>

            {/* Major Singapore Expressways Network (Google Maps Yellow / Orange) */}
            {/* PIE (Tuas to Changi) */}
            <path
              d="M 120,340 C 230,320 340,300 450,295 C 570,290 690,305 870,265"
              fill="none"
              stroke={p.expressway}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* AYE (Tuas to Marina Bay) */}
            <path
              d="M 100,370 C 200,370 300,380 420,385 C 470,390 530,375 580,380"
              fill="none"
              stroke={p.expressway}
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            {/* CTE & SLE (North-South artery) */}
            <path
              d="M 505,170 C 510,210 505,260 500,310 C 495,350 490,390 480,410"
              fill="none"
              stroke={p.expressway}
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            {/* ECP (East Coast Parkway) */}
            <path
              d="M 560,400 C 660,385 760,355 870,275"
              fill="none"
              stroke={p.expressway}
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Expressway Shields / Labels */}
            {showTrafficLayer && (
              <g pointerEvents="none" className="text-[8px] font-mono font-bold">
                <rect x="290" y="300" width="22" height="11" rx="2" fill="#047857" />
                <text x="301" y="308" textAnchor="middle" fill="#ffffff">PIE</text>
                <rect x="290" y="370" width="22" height="11" rx="2" fill="#047857" />
                <text x="301" y="378" textAnchor="middle" fill="#ffffff">AYE</text>
                <rect x="510" y="220" width="22" height="11" rx="2" fill="#047857" />
                <text x="521" y="228" textAnchor="middle" fill="#ffffff">CTE</text>
                <rect x="680" y="350" width="22" height="11" rx="2" fill="#047857" />
                <text x="691" y="358" textAnchor="middle" fill="#ffffff">ECP</text>
              </g>
            )}

            {/* Transboundary Haze Smoke Plume Layer */}
            {showHazeLayer && (
              <g className="pointer-events-none mix-blend-multiply dark:mix-blend-screen opacity-75">
                <ellipse cx="230" cy="380" rx="280" ry="190" transform="rotate(-20 230 380)" fill="url(#gmapHaze)" />
                <ellipse cx="490" cy="330" rx="220" ry="140" transform="rotate(-15 490 330)" fill="url(#gmapHaze)" opacity="0.65" />
              </g>
            )}

            {/* Google Maps Teardrop Markers for Monitoring Stations */}
            {(['north', 'west', 'central', 'east', 'south'] as const).map((regionKey) => {
              const coord = stationCoords[regionKey];
              const data = airState.regions[regionKey];
              const isSelected = selectedRegion === regionKey;
              const val = metricType === 'psi' ? data.readings.psi24h : data.readings.pm25Hourly;
              const isAlert = val >= (metricType === 'psi' ? unhealthyThreshold : 56);
              const pinColor = isAlert ? '#EA4335' : val >= 51 ? '#FBBC04' : '#34A853'; // Google red / yellow / green

              return (
                <g
                  key={`gpin-${regionKey}`}
                  transform={`translate(${coord.x}, ${coord.y})`}
                  className="cursor-pointer transition-transform duration-150 hover:scale-110"
                  filter="url(#pinShadow)"
                  onClick={(e) => {
                    e.stopPropagation();
                    jumpToRegion(regionKey);
                  }}
                >
                  {/* Outer pulsating alert ring if unhealthy */}
                  {isAlert && (
                    <circle
                      cx="0"
                      cy="-26"
                      r="22"
                      fill="none"
                      stroke="#EA4335"
                      strokeWidth="2.5"
                      className="animate-ping opacity-60"
                    />
                  )}

                  {/* Teardrop Pin Path */}
                  <path
                    d="M 0,0 C -14,-14 -18,-24 -18,-32 C -18,-42 -10,-50 0,-50 C 10,-50 18,-42 18,-32 C 18,-24 14,-14 0,0 Z"
                    fill={pinColor}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />

                  {/* Pin Center Circle Badge with PSI Value */}
                  <circle cx="0" cy="-32" r="11" fill="#ffffff" />
                  <text
                    x="0"
                    y="-28"
                    textAnchor="middle"
                    fill="#1e293b"
                    className="text-[9px] font-mono font-bold select-none"
                  >
                    {val}
                  </text>

                  {/* Sector Title Label Tag */}
                  <g transform="translate(0, 16)">
                    <rect
                      x="-38"
                      y="0"
                      width="76"
                      height="16"
                      rx="3"
                      fill={p.hudBg.includes('white') ? '#ffffff' : '#0f172a'}
                      stroke={isSelected ? '#2563EB' : '#94a3b8'}
                      strokeWidth={isSelected ? '1.8' : '0.8'}
                      opacity="0.95"
                    />
                    <text
                      x="0"
                      y="11"
                      textAnchor="middle"
                      fill={p.labelText}
                      className="text-[9px] font-sans font-bold select-none"
                    >
                      {regionKey.toUpperCase()}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Google Maps Style InfoWindow Callout Popover */}
        {activeInfoWindow && (
          <div
            className="absolute bottom-16 left-4 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-4 w-80 text-slate-800 dark:text-slate-100 animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {stationCoords[activeInfoWindow].stationName}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                  <span className="truncate">{stationCoords[activeInfoWindow].landmark}</span>
                </div>
              </div>
              <button
                onClick={() => setActiveInfoWindow(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Telemetry Numbers */}
            <div className="grid grid-cols-2 gap-2 my-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 font-mono">
              <div>
                <div className="text-[10px] text-slate-500 uppercase">24-Hr PSI</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {airState.regions[activeInfoWindow].readings.psi24h}
                </div>
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  {airState.regions[activeInfoWindow].band}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">1-Hr PM2.5</div>
                <div className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
                  {airState.regions[activeInfoWindow].readings.pm25Hourly}
                  <span className="text-[10px] text-slate-400 ml-1">µg/m³</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  {getPm25Band(airState.regions[activeInfoWindow].readings.pm25Hourly).band}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <button
                onClick={() => {
                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${stationCoords[activeInfoWindow].lat},${stationCoords[activeInfoWindow].lng}`,
                    '_blank'
                  );
                }}
                className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center justify-center gap-1 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Google Maps</span>
              </button>
              <button
                onClick={() => onSelectRegion(activeInfoWindow)}
                className="py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium transition-colors"
              >
                Inspect
              </button>
            </div>
          </div>
        )}

        {/* Google Maps Bottom Right Controls (+/- Zoom, Reset, Pegman) */}
        <div className="absolute bottom-6 right-3 z-30 flex flex-col items-center gap-2 pointer-events-auto">
          {/* Street View Pegman Button */}
          <button
            onClick={() => setStreetViewActive(!streetViewActive)}
            className={`w-9 h-9 rounded-lg shadow-md border flex items-center justify-center transition-colors ${
              streetViewActive
                ? 'bg-amber-500 text-slate-950 border-amber-600'
                : 'bg-white dark:bg-slate-900 text-amber-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            title="Google Street View Pegman"
          >
            <span className="text-base select-none">🚶‍♂️</span>
          </button>

          {/* Reset / Center Button */}
          <button
            onClick={handleResetView}
            className="w-9 h-9 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
            title="Center Singapore"
          >
            <Compass className="w-4 h-4" />
          </button>

          {/* Zoom In & Out */}
          <div className="flex flex-col bg-white dark:bg-slate-900 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={handleZoomIn}
              className="w-9 h-9 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-b border-slate-200 dark:border-slate-700 transition-colors"
              title="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="w-9 h-9 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Google Maps Bottom Legal Strip */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xs border-t border-slate-200/50 dark:border-slate-800/50 px-2 py-0.5 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 font-sans pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">Google</span>
            <span>·</span>
            <span>Singapore Ambient Air Quality</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Map data ©2026</span>
            <span className="hidden sm:inline">Terms of Use</span>
          </div>
        </div>
      </div>
    </div>
  );
};
