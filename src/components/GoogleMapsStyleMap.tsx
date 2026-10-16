import React, { useEffect, useRef, useState } from 'react';
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
    name: 'National Air Monitoring Base',
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

// Google Maps Edge Tile URLs
const GOOGLE_TILE_URLS: Record<GoogleMapTileLayer, { url: string; subdomains?: string[] }> = {
  roadmap: {
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
  },
  satellite: {
    url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
  },
  hybrid: {
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
  },
  terrain: {
    url: 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
  },
  dark: {
    url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
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

  // Sync theme
  useEffect(() => {
    if (mapType !== 'satellite' && mapType !== 'hybrid' && mapType !== 'terrain') {
      setMapType(theme === 'dark' ? 'dark' : 'roadmap');
    }
  }, [theme]);

  // Handle ResizeObserver so Leaflet scales dynamically
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      mapInstanceRef.current?.invalidateSize();
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const isMobile = window.innerWidth < 640;
    const map = L.map(mapContainerRef.current, {
      center: [1.3521, 103.8198],
      zoom: isMobile ? 10.8 : 11.5,
      minZoom: 10,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
      tapHold: true,
    });

    mapInstanceRef.current = map;

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorCoords({
        lat: +e.latlng.lat.toFixed(5),
        lng: +e.latlng.lng.toFixed(5),
      });
    });

    polygonsLayerRef.current = L.layerGroup().addTo(map);
    heatmapLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);

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

  // Update Tile Layer
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

  // Update Sector Polygons and Heatmaps
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !polygonsLayerRef.current || !heatmapLayerRef.current) return;

    polygonsLayerRef.current.clearLayers();
    heatmapLayerRef.current.clearLayers();

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

        polygonsLayerRef.current?.addLayer(polygon);
      });
    }

    if (showHazePlume) {
      (['north', 'south', 'east', 'west', 'central'] as const).forEach((sec) => {
        const station = SINGAPORE_STATIONS_COORDINATES[sec];
        const data = airState.regions[sec];
        const val = metricType === 'psi' ? data.readings.psi24h : data.readings.pm25Hourly;
        const radiusMeters = 3500 + (val / 200) * 4500;
        const color = getPsiBandColor(data.band).hex;

        const circle = L.circle([station.lat, station.lng], {
          radius: radiusMeters,
          color: 'transparent',
          fillColor: color,
          fillOpacity: val >= 101 ? 0.3 : 0.14,
        });

        heatmapLayerRef.current?.addLayer(circle);
      });
    }
  }, [airState, selectedRegion, metricType, showSectors, showHazePlume, onSelectRegion]);

  // Markers
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

      const html = `
        <div class="relative cursor-pointer transition-transform duration-150 ${isSelected ? 'scale-110 z-50' : 'hover:scale-105 z-20'}">
          ${
            isUnhealthy
              ? '<div class="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full border-2 border-red-500 animate-ping opacity-75 pointer-events-none"></div>'
              : ''
          }
          <div class="relative drop-shadow-[0_3px_5px_rgba(0,0,0,0.35)]">
            <svg width="32" height="42" viewBox="0 0 34 46">
              <path d="M17 0C7.61 0 0 7.61 0 17C0 29.75 17 46 17 46C17 46 34 29.75 34 17C34 7.61 26.39 0 17 0Z" fill="${pinColor}" stroke="#ffffff" stroke-width="1.8"/>
              <circle cx="17" cy="17" r="10" fill="#ffffff"/>
              <text x="17" y="21" text-anchor="middle" fill="#0f172a" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="700">${val}</text>
            </svg>
          </div>
          <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 px-1.5 py-0.2 bg-white/95 dark:bg-slate-900/95 rounded shadow text-[9px] font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
            ${regionKey.toUpperCase()}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'google-map-pin',
        html,
        iconSize: [32, 42],
        iconAnchor: [16, 42],
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current) return;
    const q = searchQuery.toLowerCase().trim();

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
    mapInstanceRef.current?.flyTo([1.3521, 103.8198], window.innerWidth < 640 ? 10.8 : 11.5, { duration: 0.8 });
  };

  const activeStationData = selectedPinInfo ? airState.regions[selectedPinInfo] : null;
  const activeCoord = selectedPinInfo ? SINGAPORE_STATIONS_COORDINATES[selectedPinInfo] : null;

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden shadow-xl border border-slate-300 dark:border-slate-800 select-none font-sans bg-slate-100 dark:bg-slate-950 h-[50vh] min-h-[350px] max-h-[600px] sm:h-[480px] lg:h-[580px] transition-all"
    >
      {/* 1. Leaflet Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0 cursor-grab active:cursor-grabbing" />

      {/* 2. Responsive Top Controls Bar (Search + Map Type Selector) */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Search Input Card */}
        <form
          onSubmit={handleSearchSubmit}
          className="pointer-events-auto flex items-center bg-white dark:bg-slate-900 shadow-md rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 w-44 xs:w-56 sm:w-72"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
          <input
            type="text"
            placeholder="Search town or GPS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="submit"
            className="text-blue-600 dark:text-cyan-400 hover:text-blue-800 pl-1 border-l border-slate-200 dark:border-slate-700"
            title="Fly to search target"
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Map Type Segmented Pills (Horizontally Scrollable on Mobile) */}
        <div className="pointer-events-auto flex items-center bg-white dark:bg-slate-900 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-0.5 text-[11px] font-medium overflow-x-auto max-w-[calc(100vw-200px)] xs:max-w-none">
          <button
            onClick={() => setMapType('roadmap')}
            className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
              mapType === 'roadmap' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setMapType('satellite')}
            className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
              mapType === 'satellite' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setMapType('hybrid')}
            className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
              mapType === 'hybrid' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            Hybrid
          </button>
          <button
            onClick={() => setMapType('dark')}
            className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
              mapType === 'dark' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            Night
          </button>
        </div>
      </div>

      {/* 3. Layer Toggles (Top Left) */}
      <div className="absolute top-14 left-2.5 z-30 flex flex-col gap-1 pointer-events-auto">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-1 flex flex-col gap-1 text-[11px]">
          <button
            onClick={() => setShowSectors(!showSectors)}
            className={`px-2 py-1 rounded text-left flex items-center gap-1 transition-colors ${
              showSectors ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span className="hidden xs:inline">Sectors</span>
          </button>

          <button
            onClick={() => setShowHazePlume(!showHazePlume)}
            className={`px-2 py-1 rounded text-left flex items-center gap-1 transition-colors ${
              showHazePlume ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Wind className="w-3 h-3" />
            <span className="hidden xs:inline">Haze</span>
          </button>

          <div className="pt-0.5 border-t border-slate-200 dark:border-slate-700 flex items-center gap-0.5">
            <button
              onClick={() => onMetricChange('psi')}
              className={`flex-1 py-0.5 rounded text-center text-[9px] font-mono font-bold ${
                metricType === 'psi' ? 'bg-blue-600 text-white' : 'text-slate-500'
              }`}
            >
              PSI
            </button>
            <button
              onClick={() => onMetricChange('pm25')}
              className={`flex-1 py-0.5 rounded text-center text-[9px] font-mono font-bold ${
                metricType === 'pm25' ? 'bg-blue-600 text-white' : 'text-slate-500'
              }`}
            >
              PM
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bottom Slide-Up InfoWindow Card (Mobile Responsive Drawer) */}
      {selectedPinInfo && activeStationData && activeCoord && (
        <div className="absolute bottom-10 sm:bottom-12 left-2 right-2 sm:left-4 sm:right-auto sm:w-80 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3 text-slate-800 dark:text-slate-100 animate-fadeIn">
          {/* Subtle Mobile Drag Handle */}
          <div className="sm:hidden w-8 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />

          <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-1.5">
            <div>
              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1">
                <span>{activeCoord.name}</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                <span className="truncate">{activeCoord.landmark}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedPinInfo(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 my-1.5 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 font-mono">
            <div>
              <div className="text-[9px] text-slate-500 uppercase">24-Hr PSI</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {activeStationData.readings.psi24h}
              </div>
              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                {activeStationData.band}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase">1-Hr PM2.5</div>
              <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                {activeStationData.readings.pm25Hourly}
                <span className="text-[9px] text-slate-400 ml-1">µg/m³</span>
              </div>
              <div className="text-[10px] text-slate-500">
                {getPm25Band(activeStationData.readings.pm25Hourly).band}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <button
              onClick={() => {
                window.open(
                  `https://www.google.com/maps/search/?api=1&query=${activeCoord.lat},${activeCoord.lng}`,
                  '_blank'
                );
              }}
              className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center justify-center gap-1 transition-colors min-h-[36px]"
            >
              <Navigation className="w-3 h-3" />
              <span>Google Maps</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
            </button>
            <button
              onClick={() => setStreetViewModal(true)}
              className="py-1.5 px-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded transition-colors min-h-[36px]"
            >
              Street View
            </button>
          </div>
        </div>
      )}

      {/* 5. Mobile Ergonomic Bottom-Right Controls (Zoom & Locate) */}
      <div className="absolute bottom-10 sm:bottom-6 right-2.5 z-30 flex flex-col items-center gap-1.5">
        <button
          onClick={() => setStreetViewModal(!streetViewModal)}
          className="w-9 h-9 min-h-[36px] min-w-[36px] bg-white dark:bg-slate-900 text-amber-500 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-colors active:scale-95"
          title="Street View Pegman"
        >
          <span className="text-sm select-none">🚶‍♂️</span>
        </button>

        <button
          onClick={handleResetCenter}
          className="w-9 h-9 min-h-[36px] min-w-[36px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-colors active:scale-95"
          title="Center Singapore"
        >
          <Crosshair className="w-4 h-4" />
        </button>

        <div className="flex flex-col bg-white dark:bg-slate-900 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="w-9 h-9 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-b border-slate-200 dark:border-slate-700 transition-colors active:scale-95"
            title="Zoom In"
          >
            <span className="text-base font-bold leading-none">+</span>
          </button>
          <button
            onClick={handleZoomOut}
            className="w-9 h-9 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
            title="Zoom Out"
          >
            <span className="text-base font-bold leading-none">−</span>
          </button>
        </div>
      </div>

      {/* 6. Dynamic Coordinate Bottom Status HUD */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xs border-t border-slate-200/60 dark:border-slate-800/60 px-2 py-0.5 flex items-center justify-between text-[9px] text-slate-600 dark:text-slate-400 font-sans pointer-events-none select-none">
        <div className="flex items-center gap-1 font-bold">
          <span className="text-blue-500">G</span>
          <span className="text-red-500">o</span>
          <span className="text-yellow-500">o</span>
          <span className="text-blue-500">g</span>
          <span className="text-green-500">l</span>
          <span className="text-red-500">e</span>
          <span className="font-normal text-slate-500 ml-0.5">Maps</span>
        </div>
        <div className="font-mono">
          {cursorCoords.lat.toFixed(4)}° N, {cursorCoords.lng.toFixed(4)}° E
        </div>
      </div>

      {/* 7. Street View Modal */}
      {streetViewModal && activeCoord && (
        <div className="absolute inset-2 sm:inset-auto sm:top-14 sm:right-3 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-4 sm:w-80 text-xs animate-fadeIn flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>🚶‍♂️ Street View Inspection</span>
              </span>
              <button
                onClick={() => setStreetViewModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
              Inspect ground-level air visibility and haze cameras at <strong>{activeCoord.name}</strong>.
            </p>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[10px] space-y-1 mb-3">
              <div className="text-slate-500">Station GPS:</div>
              <div className="text-cyan-600 dark:text-cyan-400 font-bold">
                {activeCoord.lat.toFixed(5)}° N, {activeCoord.lng.toFixed(5)}° E
              </div>
              <div className="text-slate-400">{activeCoord.landmark}</div>
            </div>
          </div>
          <button
            onClick={() => {
              window.open(
                `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${activeCoord.lat},${activeCoord.lng}`,
                '_blank'
              );
            }}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors min-h-[44px]"
          >
            <span>Open 360° Street View</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
