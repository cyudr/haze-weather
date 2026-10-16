import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AirQualityState, RegionName } from '../types/airQuality';
import { getPsiBandColor, getPm25Band, SINGAPORE_REGIONS } from '../services/airQualityService';
import {
  Plus,
  Minus,
  Compass,
  Layers,
  MapPin,
  X,
  Navigation,
  Wind,
  Search,
  ExternalLink,
  ShieldAlert,
  Crosshair,
  Eye,
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

export type MapStyleKey = 'roadmap' | 'satellite' | 'dark' | 'terrain';

// Exact Singapore Geographic Center & Monitoring Station Coordinates
const SG_CENTER = { lat: 1.3521, lng: 103.8198 };

const STATIONS_GEO: Record<
  RegionName,
  { lat: number; lng: number; code: string; name: string; landmark: string; postal: string }
> = {
  national: {
    lat: 1.3521,
    lng: 103.8198,
    code: 'SG-NAT',
    name: 'National Air Monitoring Network',
    landmark: 'Central Singapore (Islandwide Baseline)',
    postal: 'Singapore 179103',
  },
  north: {
    lat: 1.41803,
    lng: 103.82,
    code: 'SG-N01',
    name: 'Woodlands Station',
    landmark: 'Woodlands Ave 9 / Causeway Checkpoint',
    postal: 'Singapore 738964',
  },
  south: {
    lat: 1.29587,
    lng: 103.82,
    code: 'SG-S01',
    name: 'Telok Blangah Station',
    landmark: 'Henderson Waves / HarbourFront Basin',
    postal: 'Singapore 099253',
  },
  east: {
    lat: 1.35735,
    lng: 103.94,
    code: 'SG-E01',
    name: 'Tampines Station',
    landmark: 'Tampines Regional Hub / Changi Sector',
    postal: 'Singapore 529684',
  },
  west: {
    lat: 1.35735,
    lng: 103.7,
    code: 'SG-W01',
    name: 'Jurong West Station',
    landmark: 'Jurong Lake District / Tuas Gateway',
    postal: 'Singapore 649845',
  },
  central: {
    lat: 1.35735,
    lng: 103.82,
    code: 'SG-C01',
    name: 'Toa Payoh Central Station',
    landmark: 'Bishan-Ang Mo Kio Park / Novena Perimeter',
    postal: 'Singapore 319258',
  },
};

// Web Mercator projections
function lngToPixel(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * Math.pow(2, zoom) * 256;
}

function latToPixel(lat: number, zoom: number): number {
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const clampedSin = Math.min(Math.max(sinLat, -0.9999), 0.9999);
  return (
    (0.5 - Math.log((1 + clampedSin) / (1 - clampedSin)) / (4 * Math.PI)) *
    Math.pow(2, zoom) *
    256
  );
}

function pixelToLng(pixelX: number, zoom: number): number {
  return (pixelX / (Math.pow(2, zoom) * 256)) * 360 - 180;
}

function pixelToLat(pixelY: number, zoom: number): number {
  const y = 0.5 - pixelY / (Math.pow(2, zoom) * 256);
  return 90 - (360 * Math.atan(Math.exp(-y * 2 * Math.PI))) / Math.PI;
}

export const GoogleMapsStyleMap: React.FC<GoogleMapsStyleMapProps> = ({
  airState,
  selectedRegion,
  onSelectRegion,
  metricType,
  onMetricChange,
  unhealthyThreshold,
  theme,
}) => {
  // Map viewport states
  const [zoom, setZoom] = useState<number>(11);
  const [center, setCenter] = useState<{ lat: number; lng: number }>(SG_CENTER);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>(theme === 'dark' ? 'dark' : 'roadmap');
  const [showHazeLayer, setShowHazeLayer] = useState<boolean>(true);
  const [showWindVectors, setShowWindVectors] = useState<boolean>(true);
  const [activeInfoWindow, setActiveInfoWindow] = useState<RegionName | null>(selectedRegion);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isStreetViewOpen, setIsStreetViewOpen] = useState<boolean>(false);

  // Interaction dragging states
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 900,
    height: 560,
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; centerPixel: { x: number; y: number } }>({
    clientX: 0,
    clientY: 0,
    centerPixel: { x: 0, y: 0 },
  });

  // Track container dimensions
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Update theme sync
  useEffect(() => {
    if (mapStyle !== 'satellite') {
      setMapStyle(theme === 'dark' ? 'dark' : 'roadmap');
    }
  }, [theme]);

  // Handle Dragging / Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.interactive-control')) return;
    setIsDragging(true);
    const centerPixX = lngToPixel(center.lng, zoom);
    const centerPixY = latToPixel(center.lat, zoom);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      centerPixel: { x: centerPixX, y: centerPixY },
    };
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.clientX;
      const dy = e.clientY - dragStartRef.current.clientY;

      const newPixX = dragStartRef.current.centerPixel.x - dx;
      const newPixY = dragStartRef.current.centerPixel.y - dy;

      const newLng = pixelToLng(newPixX, zoom);
      const newLat = pixelToLat(newPixY, zoom);

      // Constrain within Singapore & surrounding waters (lat: 1.15 to 1.55, lng: 103.5 to 104.2)
      const clampedLat = Math.min(Math.max(newLat, 1.15), 1.55);
      const clampedLng = Math.min(Math.max(newLng, 103.5), 104.2);

      setCenter({ lat: clampedLat, lng: clampedLng });
    },
    [isDragging, zoom]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(16, z + 1));
    } else {
      setZoom((z) => Math.max(10, z - 1));
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(16, z + 1));
  const handleZoomOut = () => setZoom((z) => Math.max(10, z - 1));

  const handleResetCenter = () => {
    setCenter(SG_CENTER);
    setZoom(11);
  };

  const handleJumpToStation = (region: RegionName) => {
    const target = STATIONS_GEO[region];
    setCenter({ lat: target.lat, lng: target.lng });
    setZoom(13);
    onSelectRegion(region);
    setActiveInfoWindow(region);
  };

  // Compute slippy map tiles visible in current viewport
  const tiles = useMemo(() => {
    const tilePixels = 256;
    const centerPixX = lngToPixel(center.lng, zoom);
    const centerPixY = latToPixel(center.lat, zoom);

    const minPixX = centerPixX - dimensions.width / 2;
    const maxPixX = centerPixX + dimensions.width / 2;
    const minPixY = centerPixY - dimensions.height / 2;
    const maxPixY = centerPixY + dimensions.height / 2;

    const minTileX = Math.floor(minPixX / tilePixels);
    const maxTileX = Math.floor(maxPixX / tilePixels);
    const minTileY = Math.floor(minPixY / tilePixels);
    const maxTileY = Math.floor(maxPixY / tilePixels);

    const maxTilesAtZoom = Math.pow(2, zoom);
    const list: Array<{
      key: string;
      url: string;
      left: number;
      top: number;
      width: number;
      height: number;
    }> = [];

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        if (ty < 0 || ty >= maxTilesAtZoom) continue;
        const normalizedX = ((tx % maxTilesAtZoom) + maxTilesAtZoom) % maxTilesAtZoom;

        let url = '';
        if (mapStyle === 'satellite') {
          url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${normalizedX}`;
        } else if (mapStyle === 'dark') {
          url = `https://basemaps.cartocdn.com/dark_all/${zoom}/${normalizedX}/${ty}@2x.png`;
        } else {
          // Google Roadmap Carto Voyager
          url = `https://basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${normalizedX}/${ty}@2x.png`;
        }

        const left = tx * tilePixels - minPixX;
        const top = ty * tilePixels - minPixY;

        list.push({
          key: `${zoom}-${normalizedX}-${ty}-${mapStyle}`,
          url,
          left,
          top,
          width: tilePixels,
          height: tilePixels,
        });
      }
    }
    return list;
  }, [center, zoom, dimensions, mapStyle]);

  // Compute Station Pin Screen Coordinates (px relative to container)
  const stationPins = useMemo(() => {
    const centerPixX = lngToPixel(center.lng, zoom);
    const centerPixY = latToPixel(center.lat, zoom);

    return (['north', 'south', 'east', 'west', 'central'] as const).map((reg) => {
      const geo = STATIONS_GEO[reg];
      const pixX = lngToPixel(geo.lng, zoom);
      const pixY = latToPixel(geo.lat, zoom);

      const screenX = dimensions.width / 2 + (pixX - centerPixX);
      const screenY = dimensions.height / 2 + (pixY - centerPixY);

      const data = airState.regions[reg];
      const val = metricType === 'psi' ? data.readings.psi24h : data.readings.pm25Hourly;
      const isAlert = val >= (metricType === 'psi' ? unhealthyThreshold : 56);
      const colors = getPsiBandColor(data.band);

      return {
        region: reg,
        name: geo.name,
        screenX,
        screenY,
        val,
        band: data.band,
        isAlert,
        colorHex: colors.hex,
        isSelected: selectedRegion === reg,
      };
    });
  }, [center, zoom, dimensions, airState, metricType, unhealthyThreshold, selectedRegion]);

  // Scale bar calculation (approximating meters per pixel in Singapore latitude ~1.35)
  const metersPerPixel = (156543.03392 * Math.cos((SG_CENTER.lat * Math.PI) / 180)) / Math.pow(2, zoom);
  const scaleBarWidth = 100; // px
  const scaleDistanceMeters = metersPerPixel * scaleBarWidth;
  const scaleDisplay =
    scaleDistanceMeters >= 1000
      ? `${(scaleDistanceMeters / 1000).toFixed(1)} km`
      : `${Math.round(scaleDistanceMeters)} m`;

  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return (['north', 'south', 'east', 'west', 'central'] as const).filter((k) => {
      const st = STATIONS_GEO[k];
      return (
        st.name.toLowerCase().includes(q) ||
        st.landmark.toLowerCase().includes(q) ||
        k.toLowerCase().includes(q) ||
        SINGAPORE_REGIONS[k].towns.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [searchQuery]);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-800 select-none bg-[#e5e3df] dark:bg-[#1a1d24] font-sans"
      style={{ height: '580px' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* 1. SLIPPY REAL MAP TILES LAYER */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {tiles.map((t) => (
          <img
            key={t.key}
            src={t.url}
            alt=""
            loading="eager"
            referrerPolicy="no-referrer"
            className="absolute select-none pointer-events-none transition-opacity duration-150"
            style={{
              left: `${t.left}px`,
              top: `${t.top}px`,
              width: `${t.width}px`,
              height: `${t.height}px`,
              imageRendering: 'auto',
            }}
          />
        ))}
      </div>

      {/* 2. AIR QUALITY RADIAL HEAT DISPERSION OVERLAY */}
      {showHazeLayer && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none mix-blend-multiply dark:mix-blend-screen opacity-65">
          <defs>
            <radialGradient id="smokeCenter" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#EA580C" stopOpacity="0.55" />
              <stop offset="40%" stopColor="#F59E0B" stopOpacity="0.30" />
              <stop offset="85%" stopColor="#D97706" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
          </defs>
          {stationPins.map((pin) => {
            if (pin.screenX < -150 || pin.screenX > dimensions.width + 150) return null;
            if (pin.screenY < -150 || pin.screenY > dimensions.height + 150) return null;
            const radius = Math.min(220, 70 + (pin.val / 200) * 110);
            return (
              <circle
                key={`heat-${pin.region}`}
                cx={pin.screenX}
                cy={pin.screenY}
                r={radius}
                fill="url(#smokeCenter)"
              />
            );
          })}
        </svg>
      )}

      {/* 3. SOUTHWEST MONSOON WIND STREAMLINES */}
      {showWindVectors && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-45 stroke-cyan-500 stroke-1.5" strokeDasharray="6 6">
          <line x1="120" y1={dimensions.height - 80} x2="260" y2={dimensions.height - 200} markerEnd="url(#arrow)" />
          <line x1="300" y1={dimensions.height - 60} x2="440" y2={dimensions.height - 180} markerEnd="url(#arrow)" />
          <line x1="480" y1={dimensions.height - 70} x2="620" y2={dimensions.height - 190} markerEnd="url(#arrow)" />
          <line x1="660" y1={dimensions.height - 50} x2="800" y2={dimensions.height - 170} markerEnd="url(#arrow)" />
        </svg>
      )}

      {/* 4. AUTHENTIC GOOGLE MAPS TEARDROP MARKERS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {stationPins.map((pin) => {
          if (
            pin.screenX < -50 ||
            pin.screenX > dimensions.width + 50 ||
            pin.screenY < -50 ||
            pin.screenY > dimensions.height + 50
          ) {
            return null;
          }

          const isUnhealthy = pin.isAlert;
          const pinColor = isUnhealthy ? '#EA4335' : pin.val >= 51 ? '#FBBC04' : '#34A853';

          return (
            <div
              key={`pin-${pin.region}`}
              className="absolute pointer-events-auto cursor-pointer transition-transform duration-100 hover:scale-115 interactive-control"
              style={{
                left: `${pin.screenX}px`,
                top: `${pin.screenY}px`,
                transform: 'translate(-50%, -100%)',
                zIndex: pin.isSelected ? 25 : 15,
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleJumpToStation(pin.region);
              }}
            >
              {/* Outer pulsing ring for alert breach */}
              {isUnhealthy && (
                <div
                  className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-2 border-red-500 animate-ping opacity-75 pointer-events-none"
                />
              )}

              {/* Teardrop SVG Pin */}
              <svg width="34" height="46" viewBox="0 0 34 46" className="drop-shadow-lg">
                <path
                  d="M17 0C7.61 0 0 7.61 0 17C0 29.75 17 46 17 46C17 46 34 29.75 34 17C34 7.61 26.39 0 17 0Z"
                  fill={pinColor}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                {/* Center Badge with PSI/PM2.5 value */}
                <circle cx="17" cy="17" r="10" fill="#ffffff" />
                <text
                  x="17"
                  y="21"
                  textAnchor="middle"
                  fill="#1E293B"
                  className="text-[10px] font-mono font-bold select-none"
                >
                  {pin.val}
                </text>
              </svg>

              {/* Station Label pill */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs rounded shadow-md border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap flex items-center gap-1 select-none">
                <span className="capitalize">{pin.region}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. GOOGLE MAPS STYLE SEARCH BAR & MAP TYPE SWITCHER */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Floating Google Maps Search Card */}
        <div className="pointer-events-auto flex items-center bg-white dark:bg-slate-900 shadow-md rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 w-full sm:w-80 interactive-control">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search Singapore e.g. Woodlands, Jurong..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mr-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleResetCenter}
            className="text-blue-600 dark:text-cyan-400 hover:text-blue-800 pl-1 border-l border-slate-200 dark:border-slate-700"
            title="Directions / Center Singapore"
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search Autocomplete Dropdown */}
        {filteredStations.length > 0 && (
          <div className="pointer-events-auto absolute top-14 left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg p-2 text-xs w-80 z-40 interactive-control">
            {filteredStations.map((k) => (
              <button
                key={k}
                onClick={() => {
                  handleJumpToStation(k);
                  setSearchQuery('');
                }}
                className="w-full text-left p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white capitalize">
                    {STATIONS_GEO[k].name}
                  </div>
                  <div className="text-[11px] text-slate-500">{STATIONS_GEO[k].landmark}</div>
                </div>
                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                  PSI {airState.regions[k].readings.psi24h}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Google Maps Style Layer Switcher Pill */}
        <div className="pointer-events-auto flex items-center bg-white dark:bg-slate-900 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-0.5 ml-auto text-xs font-medium interactive-control">
          <button
            onClick={() => setMapStyle('roadmap')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              mapStyle === 'roadmap'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setMapStyle('satellite')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              mapStyle === 'satellite'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setMapStyle('dark')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              mapStyle === 'dark'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Night
          </button>
        </div>
      </div>

      {/* 6. FLOATING QUICK OVERLAYS (Top Left) */}
      <div className="absolute top-16 left-3 z-30 flex flex-col gap-1.5 pointer-events-auto interactive-control">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-1 flex flex-col gap-1 text-xs">
          <button
            onClick={() => setShowHazeLayer(!showHazeLayer)}
            className={`px-2.5 py-1.5 rounded text-left flex items-center gap-1.5 transition-colors ${
              showHazeLayer
                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Toggle Transboundary Haze Smoke Plume Heatmap"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Haze Heatmap</span>
          </button>

          <button
            onClick={() => setShowWindVectors(!showWindVectors)}
            className={`px-2.5 py-1.5 rounded text-left flex items-center gap-1.5 transition-colors ${
              showWindVectors
                ? 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Toggle Monsoon Wind Streamlines"
          >
            <Wind className="w-3.5 h-3.5" />
            <span>SW Monsoon</span>
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

      {/* 7. AUTHENTIC GOOGLE MAPS INFOWINDOW PLACE CARD */}
      {activeInfoWindow && (
        <div
          className="absolute bottom-16 left-4 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-4 w-80 text-slate-800 dark:text-slate-100 animate-fadeIn interactive-control"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{STATIONS_GEO[activeInfoWindow].name}</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                <span className="truncate">{STATIONS_GEO[activeInfoWindow].landmark}</span>
              </div>
              <div className="text-[10px] text-amber-500 font-semibold mt-0.5">
                4.9 ★★★★★ · Ambient Air Monitoring Station
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
                  `https://www.google.com/maps/search/?api=1&query=${STATIONS_GEO[activeInfoWindow].lat},${STATIONS_GEO[activeInfoWindow].lng}`,
                  '_blank'
                );
              }}
              className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center justify-center gap-1 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Open in Google Maps</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
            </button>
            <button
              onClick={() => onSelectRegion(activeInfoWindow)}
              className="py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium transition-colors"
            >
              Select
            </button>
          </div>
        </div>
      )}

      {/* 8. AUTHENTIC GOOGLE MAPS BOTTOM-RIGHT CONTROLS */}
      <div className="absolute bottom-6 right-3 z-30 flex flex-col items-center gap-2 pointer-events-auto interactive-control">
        {/* Street View Pegman Button */}
        <button
          onClick={() => setIsStreetViewOpen(!isStreetViewOpen)}
          className={`w-9 h-9 rounded-lg shadow-md border flex items-center justify-center transition-colors ${
            isStreetViewOpen
              ? 'bg-amber-500 text-slate-950 border-amber-600'
              : 'bg-white dark:bg-slate-900 text-amber-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
          title="Street View Pegman"
        >
          <span className="text-base select-none">🚶‍♂️</span>
        </button>

        {/* Center / Locate Button */}
        <button
          onClick={handleResetCenter}
          className="w-9 h-9 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
          title="Center Singapore"
        >
          <Crosshair className="w-4 h-4" />
        </button>

        {/* Zoom In & Out Buttons */}
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

      {/* 9. AUTHENTIC GOOGLE WATERMARK & BOTTOM SCALE BAR */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-white/75 dark:bg-slate-950/75 backdrop-blur-xs border-t border-slate-200/50 dark:border-slate-800/50 px-3 py-0.5 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 font-sans pointer-events-none select-none">
        {/* Google Logo Watermark */}
        <div className="flex items-center gap-1.5 font-bold tracking-tight text-slate-700 dark:text-slate-300">
          <span className="text-blue-500">G</span>
          <span className="text-red-500">o</span>
          <span className="text-yellow-500">o</span>
          <span className="text-blue-500">g</span>
          <span className="text-green-500">l</span>
          <span className="text-red-500">e</span>
          <span className="font-normal text-slate-500 ml-1 hidden sm:inline">Singapore Map View</span>
        </div>

        {/* Scale & Copyright */}
        <div className="flex items-center gap-4">
          {/* Dynamic Google Scale Bar */}
          <div className="hidden sm:flex items-center gap-1.5 font-mono text-[9px]">
            <div
              className="h-1 border-b-2 border-l-2 border-r-2 border-slate-700 dark:border-slate-300"
              style={{ width: `${scaleBarWidth}px` }}
            />
            <span>{scaleDisplay}</span>
          </div>

          <div className="flex items-center gap-2">
            <span>Imagery ©2026</span>
            <span className="hidden md:inline">Terms of Use</span>
          </div>
        </div>
      </div>

      {/* Street View Preview Drawer if Pegman toggled */}
      {isStreetViewOpen && (
        <div className="absolute top-16 right-3 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3 w-72 text-xs animate-fadeIn interactive-control">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
              <span>🚶‍♂️ Street View Preview</span>
            </span>
            <button
              onClick={() => setIsStreetViewOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            Click any station marker on the map to inspect ground-level visibility and ambient haze cameras in Singapore.
          </p>
          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px] text-slate-700 dark:text-slate-300 truncate">
            Target: {STATIONS_GEO[selectedRegion].name} ({STATIONS_GEO[selectedRegion].lat.toFixed(4)}, {STATIONS_GEO[selectedRegion].lng.toFixed(4)})
          </div>
        </div>
      )}
    </div>
  );
};
