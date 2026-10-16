import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { AirQualityState, RegionName } from '../types/airQuality';
import { getPsiBandColor, getPm25Band, SINGAPORE_REGIONS } from '../services/airQualityService';
import {
  Layers,
  Search,
  X,
  Navigation,
  Crosshair,
  MapPin,
  ExternalLink,
  Wind,
  Compass,
  Check,
  Maximize2,
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

export type GoogleMapTileLayer = 'roadmap' | 'satellite' | 'hybrid' | 'terrain' | 'dark';

// Exact Singapore Coordinates (WGS84) from Singapore NEA / data.gov.sg
export const SINGAPORE_STATIONS_COORDINATES: Record<
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
    landmark: 'Woodlands Ave 9 / Causeway Checkpoint Area',
    postal: 'Singapore 738964',
  },
  south: {
    lat: 1.29587,
    lng: 103.82,
    code: 'SG-S01',
    name: 'Telok Blangah Station',
    landmark: 'Henderson Waves / HarbourFront / Sentosa Basin',
    postal: 'Singapore 099253',
  },
  east: {
    lat: 1.35735,
    lng: 103.94,
    code: 'SG-E01',
    name: 'Tampines Station',
    landmark: 'Tampines Regional Hub / Changi Airport Sector',
    postal: 'Singapore 529684',
  },
  west: {
    lat: 1.35735,
    lng: 103.7,
    code: 'SG-W01',
    name: 'Jurong West Station',
    landmark: 'Jurong Lake District / Tuas Industrial Gateway',
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

// Singapore 5 NEA Sector Boundary Polygons [lat, lng]
const SECTOR_POLYGONS: Record<Exclude<RegionName, 'national'>, [number, number][]> = {
  north: [
    [1.4705, 103.765],
    [1.4600, 103.840],
    [1.4450, 103.870],
    [1.4100, 103.850],
    [1.3850, 103.830],
    [1.3900, 103.750],
    [1.4350, 103.720],
  ],
  west: [
    [1.3900, 103.750],
    [1.3850, 103.830],
    [1.3300, 103.780],
    [1.2900, 103.730],
    [1.2400, 103.630],
    [1.2200, 103.600],
    [1.3000, 103.620],
    [1.3600, 103.680],
  ],
  central: [
    [1.3850, 103.830],
    [1.4100, 103.850],
    [1.3700, 103.890],
    [1.3200, 103.870],
    [1.2900, 103.840],
    [1.2900, 103.810],
    [1.3300, 103.780],
  ],
  south: [
    [1.3200, 103.870],
    [1.2900, 103.860],
    [1.2700, 103.860],
    [1.2400, 103.820],
    [1.2500, 103.790],
    [1.2900, 103.730],
    [1.2900, 103.810],
    [1.2900, 103.840],
  ],
  east: [
    [1.4450, 103.870],
    [1.4200, 103.920],
    [1.4100, 104.020],
    [1.3600, 104.050],
    [1.3000, 103.980],
    [1.2900, 103.860],
    [1.3200, 103.870],
    [1.3700, 103.890],
    [1.4100, 103.850],
  ],
};

// Google Maps Official Tile URLs (Direct high-speed edge tiles)
const GOOGLE_TILE_URLS: Record<GoogleMapTileLayer, { url: string; subdomains?: string[]; attribution: string }> = {
  roadmap: {
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: 'Map data ©Google',
  },
  satellite: {
    url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: 'Imagery ©Google',
  },
  hybrid: {
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: 'Map data ©Google · Imagery ©Google',
  },
  terrain: {
    url: 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: 'Map data ©Google',
  },
  dark: {
    url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
    attribution: 'Map data ©OpenStreetMap, ©CartoDB',
  },
};

export const GoogleMapsStyleMap: React.FC<GoogleMapsStyleMapProps> = ({
  airState,
  selectedRegion,
  onSelectRegion,
  metricType,
  onMetricChange,
  unhealthyThreshold,
  theme,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polygonsLayerRef = useRef<L.LayerGroup | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);

  const [mapType, setMapType] = useState<GoogleMapTileLayer>(theme === 'dark' ? 'dark' : 'roadmap');
  const [showHazePlume, setShowHazePlume] = useState<boolean>(true);
  const [showSectors, setShowSectors] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number }>({
    lat: 1.3521,
    lng: 103.8198,
  });
  const [selectedPinInfo, setSelectedPinInfo] = useState<RegionName | null>(selectedRegion);
  const [streetViewModal, setStreetViewModal] = useState<boolean>(false);

  // Sync default map style if theme changes and user hasn't explicitly chosen satellite
  useEffect(() => {
    if (mapType !== 'satellite' && mapType !== 'hybrid' && mapType !== 'terrain') {
      setMapType(theme === 'dark' ? 'dark' : 'roadmap');
    }
  }, [theme]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Singapore [1.3521, 103.8198] at zoom level 11.5
    const map = L.map(mapContainerRef.current, {
      center: [1.3521, 103.8198],
      zoom: 11.5,
      minZoom: 10,
      maxZoom: 18,
      zoomControl: false, // We render Google Maps styled zoom controls
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    // Track mouse coordinate readout
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorCoords({
        lat: +e.latlng.lat.toFixed(5),
        lng: +e.latlng.lng.toFixed(5),
      });
    });

    // Create Layer Groups
    polygonsLayerRef.current = L.layerGroup().addTo(map);
    heatmapLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);

    // Initial tile layer
    const config = GOOGLE_TILE_URLS[mapType];
    tileLayerRef.current = L.tileLayer(config.url, {
      subdomains: config.subdomains || ['a', 'b', 'c'],
      maxZoom: 19,
    }).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer when mapType changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const config = GOOGLE_TILE_URLS[mapType];
    tileLayerRef.current = L.tileLayer(config.url, {
      subdomains: config.subdomains || ['a', 'b', 'c'],
      maxZoom: 19,
    }).addTo(map);
  }, [mapType]);

  // Render Sector Polygons and Haze Heatmaps
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !polygonsLayerRef.current || !heatmapLayerRef.current) return;

    polygonsLayerRef.current.clearLayers();
    heatmapLayerRef.current.clearLayers();

    // Render Sector Polygons
    if (showSectors) {
      (Object.keys(SECTOR_POLYGONS) as (keyof typeof SECTOR_POLYGONS)[]).forEach((sec) => {
        const coords = SECTOR_POLYGONS[sec];
        const data = airState.regions[sec];
        const val = metricType === 'psi' ? data.readings.psi24h : data.readings.pm25Hourly;
        const isSelected = selectedRegion === sec;
        const color = getPsiBandColor(data.band).hex;

        const polygon = L.polygon(coords, {
          color: isSelected ? '#2563EB' : color,
          weight: isSelected ? 3 : 1.5,
          opacity: isSelected ? 0.9 : 0.6,
          fillColor: color,
          fillOpacity: isSelected ? 0.35 : 0.18,
          dashArray: isSelected ? undefined : '4 4',
        });

        polygon.on('click', () => {
          onSelectRegion(sec);
          setSelectedPinInfo(sec);
        });

        polygon.bindTooltip(
          `<strong>${data.displayName}</strong><br/>${metricType === 'psi' ? `24-Hr PSI: ${val}` : `1-Hr PM2.5: ${val} µg/m³`}`,
          { direction: 'center', permanent: false, className: 'gmap-tooltip' }
        );

        polygonsLayerRef.current?.addLayer(polygon);
      });
    }

    // Render Transboundary Haze Smoke Plume Circles
    if (showHazePlume) {
      (['north', 'south', 'east', 'west', 'central'] as const).forEach((sec) => {
        const station = SINGAPORE_STATIONS_COORDINATES[sec];
        const data = airState.regions[sec];
        const val = metricType === 'psi' ? data.readings.psi24h : data.readings.pm25Hourly;
        const radiusMeters = 4000 + (val / 200) * 5000;
        const color = getPsiBandColor(data.band).hex;

        const circle = L.circle([station.lat, station.lng], {
          radius: radiusMeters,
          color: 'transparent',
          fillColor: color,
          fillOpacity: val >= 101 ? 0.32 : 0.15,
        });

        heatmapLayerRef.current?.addLayer(circle);
      });
    }
  }, [airState, selectedRegion, metricType, showSectors, showHazePlume, onSelectRegion]);

  // Render Google Teardrop Markers at Exact Coordinates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    (['north', 'south', 'east', 'west', 'central'] as const).forEach((regionKey) => {
      const coord = SINGAPORE_STATIONS_COORDINATES[regionKey];
      const data = airState.regions[regionKey];
      const val = metricType === 'psi' ? data.readings.psi24h : data.readings.pm25Hourly;
      const isSelected = selectedRegion === regionKey;
      const isUnhealthy = val >= (metricType === 'psi' ? unhealthyThreshold : 56);
      const pinColor = isUnhealthy ? '#EA4335' : val >= 51 ? '#FBBC04' : '#34A853';

      // Authentic Google Maps Teardrop Marker HTML
      const html = `
        <div class="relative cursor-pointer transition-transform duration-150 ${isSelected ? 'scale-115 z-50' : 'hover:scale-110 z-20'}">
          ${
            isUnhealthy
              ? '<div class="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full border-2 border-red-500 animate-ping opacity-75 pointer-events-none"></div>'
              : ''
          }
          <div class="relative drop-shadow-[0_4px_6px_rgba(0,0,0,0.35)]">
            <svg width="34" height="46" viewBox="0 0 34 46">
              <path d="M17 0C7.61 0 0 7.61 0 17C0 29.75 17 46 17 46C17 46 34 29.75 34 17C34 7.61 26.39 0 17 0Z" fill="${pinColor}" stroke="#ffffff" stroke-width="1.8"/>
              <circle cx="17" cy="17" r="10" fill="#ffffff"/>
              <text x="17" y="21" text-anchor="middle" fill="#0f172a" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="700">${val}</text>
            </svg>
          </div>
          <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 px-1.5 py-0.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs rounded shadow border border-slate-300 dark:border-slate-700 text-[10px] font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
            ${regionKey.toUpperCase()}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'google-map-pin',
        html,
        iconSize: [34, 46],
        iconAnchor: [17, 46],
      });

      const marker = L.marker([coord.lat, coord.lng], { icon: customIcon });

      marker.on('click', () => {
        onSelectRegion(regionKey);
        setSelectedPinInfo(regionKey);
        map.flyTo([coord.lat, coord.lng], 13.5, { duration: 0.8 });
      });

      markersLayerRef.current?.addLayer(marker);
    });
  }, [airState, selectedRegion, metricType, unhealthyThreshold, onSelectRegion]);

  // Handle Search and Jump
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current) return;
    const q = searchQuery.toLowerCase().trim();

    // Check if input is GPS coordinates like "1.352, 103.82"
    const coordMatch = q.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[3]);
      mapInstanceRef.current.flyTo([lat, lng], 14, { duration: 1.2 });
      return;
    }

    const matchedRegion = (Object.keys(SINGAPORE_STATIONS_COORDINATES) as RegionName[]).find((k) => {
      const st = SINGAPORE_STATIONS_COORDINATES[k];
      return (
        st.name.toLowerCase().includes(q) ||
        st.landmark.toLowerCase().includes(q) ||
        k.toLowerCase().includes(q) ||
        SINGAPORE_REGIONS[k].towns.some((t) => t.toLowerCase().includes(q))
      );
    });

    if (matchedRegion) {
      const target = SINGAPORE_STATIONS_COORDINATES[matchedRegion];
      mapInstanceRef.current.flyTo([target.lat, target.lng], 14, { duration: 1 });
      onSelectRegion(matchedRegion);
      setSelectedPinInfo(matchedRegion);
      setSearchQuery('');
    }
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetCenter = () => {
    mapInstanceRef.current?.flyTo([1.3521, 103.8198], 11.5, { duration: 0.8 });
  };

  const activeStationData = selectedPinInfo ? airState.regions[selectedPinInfo] : null;
  const activeCoord = selectedPinInfo ? SINGAPORE_STATIONS_COORDINATES[selectedPinInfo] : null;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-800 select-none font-sans bg-slate-100 dark:bg-slate-950" style={{ height: '580px' }}>
      {/* 1. Leaflet Real Google Maps Tile Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0 cursor-grab active:cursor-grabbing" />

      {/* 2. Top-Left Google Maps Search Bar */}
      <div className="absolute top-3 left-3 z-30 flex flex-wrap items-center gap-2">
        <form
          onSubmit={handleSearchSubmit}
          className="flex items-center bg-white dark:bg-slate-900 shadow-md rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 w-72 sm:w-80"
        >
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search Singapore place or lat, lng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mr-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            className="text-blue-600 dark:text-cyan-400 hover:text-blue-800 pl-1 border-l border-slate-200 dark:border-slate-700"
            title="Search or Fly To Coordinates"
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* 3. Top-Right Google Maps Map Type Switcher */}
      <div className="absolute top-3 right-3 z-30 flex items-center bg-white dark:bg-slate-900 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-0.5 text-xs font-medium">
        <button
          onClick={() => setMapType('roadmap')}
          className={`px-2.5 py-1.5 rounded-md transition-colors ${
            mapType === 'roadmap'
              ? 'bg-blue-600 text-white font-semibold shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Map
        </button>
        <button
          onClick={() => setMapType('satellite')}
          className={`px-2.5 py-1.5 rounded-md transition-colors ${
            mapType === 'satellite'
              ? 'bg-blue-600 text-white font-semibold shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Satellite
        </button>
        <button
          onClick={() => setMapType('hybrid')}
          className={`px-2.5 py-1.5 rounded-md transition-colors ${
            mapType === 'hybrid'
              ? 'bg-blue-600 text-white font-semibold shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Hybrid
        </button>
        <button
          onClick={() => setMapType('terrain')}
          className={`px-2.5 py-1.5 rounded-md transition-colors ${
            mapType === 'terrain'
              ? 'bg-blue-600 text-white font-semibold shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Terrain
        </button>
        <button
          onClick={() => setMapType('dark')}
          className={`px-2.5 py-1.5 rounded-md transition-colors ${
            mapType === 'dark'
              ? 'bg-blue-600 text-white font-semibold shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Night
        </button>
      </div>

      {/* 4. Left Toolbar Layers Toggles */}
      <div className="absolute top-16 left-3 z-30 flex flex-col gap-1.5">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-1 flex flex-col gap-1 text-xs">
          <button
            onClick={() => setShowSectors(!showSectors)}
            className={`px-2.5 py-1.5 rounded text-left flex items-center gap-1.5 transition-colors ${
              showSectors
                ? 'bg-blue-500/15 text-blue-800 dark:text-blue-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Toggle Singapore 5 Sector Polygon Boundaries"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Sector Boundaries</span>
          </button>

          <button
            onClick={() => setShowHazePlume(!showHazePlume)}
            className={`px-2.5 py-1.5 rounded text-left flex items-center gap-1.5 transition-colors ${
              showHazePlume
                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Toggle Transboundary Haze Smoke Plume Dispersion"
          >
            <Wind className="w-3.5 h-3.5" />
            <span>Haze Heatmap</span>
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

      {/* 5. Google Maps Styled InfoWindow Place Card (Bottom Left) */}
      {selectedPinInfo && activeStationData && activeCoord && (
        <div className="absolute bottom-12 left-4 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-4 w-80 text-slate-800 dark:text-slate-100 animate-fadeIn">
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{activeCoord.name}</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                <span className="truncate">{activeCoord.landmark}</span>
              </div>
              <div className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">
                GPS: {activeCoord.lat.toFixed(5)}° N, {activeCoord.lng.toFixed(5)}° E
              </div>
            </div>
            <button
              onClick={() => setSelectedPinInfo(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 my-2 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 font-mono">
            <div>
              <div className="text-[10px] text-slate-500 uppercase">24-Hr PSI</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {activeStationData.readings.psi24h}
              </div>
              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                {activeStationData.band}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase">1-Hr PM2.5</div>
              <div className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
                {activeStationData.readings.pm25Hourly}
                <span className="text-[10px] text-slate-400 ml-1">µg/m³</span>
              </div>
              <div className="text-[10px] text-slate-500">
                {getPm25Band(activeStationData.readings.pm25Hourly).band}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <button
              onClick={() => {
                window.open(
                  `https://www.google.com/maps/search/?api=1&query=${activeCoord.lat},${activeCoord.lng}`,
                  '_blank'
                );
              }}
              className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center justify-center gap-1 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Google Maps</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
            </button>
            <button
              onClick={() => setStreetViewModal(true)}
              className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded transition-colors"
              title="Inspect Street View at Station Coordinates"
            >
              Street View
            </button>
          </div>
        </div>
      )}

      {/* 6. Bottom-Right Controls: Google Pegman, Locate & +/- Zoom */}
      <div className="absolute bottom-6 right-3 z-30 flex flex-col items-center gap-2">
        {/* Street View Pegman */}
        <button
          onClick={() => setStreetViewModal(!streetViewModal)}
          className={`w-9 h-9 rounded-lg shadow-md border flex items-center justify-center transition-colors ${
            streetViewModal
              ? 'bg-amber-500 text-slate-950 border-amber-600'
              : 'bg-white dark:bg-slate-900 text-amber-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
          title="Google Street View Pegman"
        >
          <span className="text-base select-none">🚶‍♂️</span>
        </button>

        {/* Center Singapore Button */}
        <button
          onClick={handleResetCenter}
          className="w-9 h-9 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
          title="Center Singapore [1.3521, 103.8198]"
        >
          <Crosshair className="w-4 h-4" />
        </button>

        {/* Zoom In & Out */}
        <div className="flex flex-col bg-white dark:bg-slate-900 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="w-9 h-9 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-b border-slate-200 dark:border-slate-700 transition-colors"
            title="Zoom In"
          >
            <span className="text-lg font-bold leading-none">+</span>
          </button>
          <button
            onClick={handleZoomOut}
            className="w-9 h-9 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Zoom Out"
          >
            <span className="text-lg font-bold leading-none">−</span>
          </button>
        </div>
      </div>

      {/* 7. Bottom Real-Time Coordinate HUD & Google Watermark */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xs border-t border-slate-200/50 dark:border-slate-800/50 px-3 py-1 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 font-sans pointer-events-none select-none">
        {/* Google Logo Watermark */}
        <div className="flex items-center gap-1.5 font-bold tracking-tight text-slate-700 dark:text-slate-300 pointer-events-auto">
          <span className="text-blue-500">G</span>
          <span className="text-red-500">o</span>
          <span className="text-yellow-500">o</span>
          <span className="text-blue-500">g</span>
          <span className="text-green-500">l</span>
          <span className="text-red-500">e</span>
          <span className="font-normal text-slate-500 ml-1 hidden sm:inline">Map Interface</span>
        </div>

        {/* Live Cursor Coordinate HUD */}
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span className="text-slate-700 dark:text-slate-300 font-semibold">
            {cursorCoords.lat.toFixed(5)}° N, {cursorCoords.lng.toFixed(5)}° E
          </span>
          <span className="text-slate-400 hidden md:inline">|</span>
          <span className="text-slate-500 hidden md:inline">WGS84 Datum</span>
        </div>
      </div>

      {/* 8. Street View Drawer Modal */}
      {streetViewModal && activeCoord && (
        <div className="absolute top-16 right-3 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-4 w-80 text-xs animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>🚶‍♂️ Google Street View Probe</span>
            </span>
            <button
              onClick={() => setStreetViewModal(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            Inspect panoramic ground-level visibility and ambient haze conditions at{' '}
            <strong>{activeCoord.name}</strong>.
          </p>
          <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[10px] space-y-1 mb-3">
            <div className="text-slate-500">Coordinates:</div>
            <div className="text-cyan-600 dark:text-cyan-400 font-bold">
              {activeCoord.lat.toFixed(5)}° N, {activeCoord.lng.toFixed(5)}° E
            </div>
            <div className="text-slate-400">{activeCoord.landmark}</div>
          </div>
          <button
            onClick={() => {
              window.open(
                `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${activeCoord.lat},${activeCoord.lng}`,
                '_blank'
              );
            }}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Open 360° Street View</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
