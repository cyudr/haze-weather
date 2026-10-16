/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  AirQualityState,
  AlertConfig,
  HourlyTrendPoint,
  RegionName,
  TriggeredAlert,
} from './types/airQuality';
import {
  createDefaultState,
  fetchLiveSingaporePsi,
  generateHourlyTrends,
  SINGAPORE_REGIONS,
} from './services/airQualityService';
import {
  loadAlertConfig,
  saveAlertConfig,
  loadAlertHistory,
  saveAlertHistory,
  playSyntheticAlertSound,
  dispatchSystemNotification,
} from './services/notificationService';
import { TopBar } from './components/TopBar';
import { AlertBanner } from './components/AlertBanner';
import { GoogleMapsStyleMap } from './components/GoogleMapsStyleMap';
import { SingaporeMap } from './components/SingaporeMap';
import { MetricsOverview } from './components/MetricsOverview';
import { HistoricalTrendChart } from './components/HistoricalTrendChart';
import { HealthAdvisoryGuide } from './components/HealthAdvisoryGuide';
import { AlertThresholdModal } from './components/AlertThresholdModal';
import { ScenarioSimulator } from './components/ScenarioSimulator';
import { Map, Layers, ShieldCheck, MapPin } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'advisory' | 'trends'>('overview');
  const [mapPresentation, setMapPresentation] = useState<'google' | 'vector'>('google');
  
  // Dark / Light Mode State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sg_airwatch_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    }
    return 'dark';
  });

  const [airState, setAirState] = useState<AirQualityState>(() => createDefaultState('live'));
  const [selectedRegion, setSelectedRegion] = useState<RegionName>('national');
  const [metricType, setMetricType] = useState<'psi' | 'pm25'>('psi');
  const [scenario, setScenario] = useState<'live' | 'unhealthy_west' | 'severe_haze' | 'clean_day'>('live');
  const [isFetchingLive, setIsFetchingLive] = useState<boolean>(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>(loadAlertConfig);
  const [alertHistory, setAlertHistory] = useState<TriggeredAlert[]>(loadAlertHistory);
  const [activeBannerAlert, setActiveBannerAlert] = useState<TriggeredAlert | null>(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [trendData, setTrendData] = useState<HourlyTrendPoint[]>(() =>
    generateHourlyTrends(createDefaultState('live'))
  );

  const lastAlertTimeRef = useRef<number>(0);

  // Apply dark / light class to root document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('sg_airwatch_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Load initial live data from data.gov.sg
  const loadLiveData = useCallback(async () => {
    setIsFetchingLive(true);
    try {
      const data = await fetchLiveSingaporePsi();
      setAirState(data);
      setTrendData(generateHourlyTrends(data));
    } finally {
      setIsFetchingLive(false);
    }
  }, []);

  useEffect(() => {
    if (scenario === 'live') {
      loadLiveData();
    }
  }, [loadLiveData, scenario]);

  // Handle scenario changes (stress-test unhealthy thresholds)
  const handleSelectScenario = (sc: 'live' | 'unhealthy_west' | 'severe_haze' | 'clean_day') => {
    setScenario(sc);
    if (sc === 'live') {
      loadLiveData();
    } else {
      const simulated = createDefaultState(sc);
      setAirState(simulated);
      setTrendData(generateHourlyTrends(simulated));
    }
  };

  // Evaluate threshold breaches and trigger notifications
  const evaluateAlerts = useCallback(
    (state: AirQualityState, config: AlertConfig) => {
      if (!config.enabled) return;

      const targetRegions: RegionName[] =
        config.selectedRegions.length > 0
          ? config.selectedRegions
          : ['west', 'south', 'north', 'east', 'central'];

      let breachedAlert: TriggeredAlert | null = null;

      for (const reg of targetRegions) {
        const regData = state.regions[reg];
        const psi = regData.readings.psi24h;
        const pm25 = regData.readings.pm25Hourly;

        if (psi >= config.psiThreshold) {
          breachedAlert = {
            id: `psi-${reg}-${Date.now()}`,
            timestamp: new Date().toISOString(),
            region: reg,
            regionDisplayName: SINGAPORE_REGIONS[reg].displayName,
            metric: 'PSI',
            value: psi,
            threshold: config.psiThreshold,
            band: regData.band,
            message: `${SINGAPORE_REGIONS[reg].displayName} sector reached ${psi} 24-Hr PSI (Threshold: ${config.psiThreshold}). Reduce strenuous outdoor exertion.`,
            acknowledged: false,
          };
          break;
        } else if (pm25 >= config.pm25Threshold) {
          breachedAlert = {
            id: `pm25-${reg}-${Date.now()}`,
            timestamp: new Date().toISOString(),
            region: reg,
            regionDisplayName: SINGAPORE_REGIONS[reg].displayName,
            metric: 'PM2.5',
            value: pm25,
            threshold: config.pm25Threshold,
            band: regData.band,
            message: `${SINGAPORE_REGIONS[reg].displayName} 1-Hr PM2.5 elevated to ${pm25} µg/m³ (Threshold: ${config.pm25Threshold}).`,
            acknowledged: false,
          };
          break;
        }
      }

      if (breachedAlert) {
        setActiveBannerAlert(breachedAlert);

        // Throttle repeated browser pushes (minimum 30 seconds between audio/push alerts)
        const now = Date.now();
        if (now - lastAlertTimeRef.current > 30000) {
          lastAlertTimeRef.current = now;

          // Dispatch native browser notification
          if (config.browserPushGranted) {
            dispatchSystemNotification('SG AirWatch: Air Quality Alert', {
              body: breachedAlert.message,
              tag: 'air-quality-threshold',
            });
          }

          // Sound alert
          if (config.soundEnabled) {
            playSyntheticAlertSound(breachedAlert.value >= 201 ? 'critical' : 'warning');
          }

          // Add to persistent history
          setAlertHistory((prev) => {
            const updated = [breachedAlert!, ...prev];
            saveAlertHistory(updated);
            return updated;
          });
        }
      } else {
        // If air quality returned below threshold in all sectors
        setActiveBannerAlert(null);
      }
    },
    []
  );

  useEffect(() => {
    evaluateAlerts(airState, alertConfig);
  }, [airState, alertConfig, evaluateAlerts]);

  // Periodic polling every 5 minutes when live
  useEffect(() => {
    if (scenario !== 'live') return;
    const interval = setInterval(() => {
      loadLiveData();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [scenario, loadLiveData]);

  const handleSaveConfig = (newConfig: AlertConfig) => {
    setAlertConfig(newConfig);
    saveAlertConfig(newConfig);
    evaluateAlerts(airState, newConfig);
  };

  const handleClearHistory = () => {
    setAlertHistory([]);
    saveAlertHistory([]);
  };

  const handleTriggerTestAlert = () => {
    const testAlert: TriggeredAlert = {
      id: `test-${Date.now()}`,
      timestamp: new Date().toISOString(),
      region: 'west',
      regionDisplayName: 'West Singapore',
      metric: 'PSI',
      value: 128,
      threshold: alertConfig.psiThreshold,
      band: 'Unhealthy',
      message: 'TEST ALERT: West Singapore 24-Hr PSI reached 128 (Unhealthy). Limit strenuous outdoor physical exertion.',
      acknowledged: false,
    };

    setActiveBannerAlert(testAlert);
    if (alertConfig.soundEnabled) {
      playSyntheticAlertSound('warning');
    }
    dispatchSystemNotification('SG AirWatch: Threshold Breach Test', {
      body: testAlert.message,
      tag: 'sg-airwatch-test',
    });
    setAlertHistory((prev) => {
      const updated = [testAlert, ...prev];
      saveAlertHistory(updated);
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Bar Header */}
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAlertModal={() => setIsAlertModalOpen(true)}
        hasActiveAlert={activeBannerAlert !== null}
        alertCount={alertHistory.length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Active Threshold Alert Banner */}
      <AlertBanner
        activeAlert={activeBannerAlert}
        onDismiss={() => setActiveBannerAlert(null)}
        onOpenAdvisory={() => setActiveTab('advisory')}
        onOpenAlertModal={() => setIsAlertModalOpen(true)}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24 md:pb-8">
        {/* Scenario Simulator & Live Feed Controller Strip */}
        <ScenarioSimulator
          currentScenario={scenario}
          onSelectScenario={handleSelectScenario}
          isFetchingLive={isFetchingLive}
          onRefreshLive={loadLiveData}
        />

        {/* Tab 1: Overview (Split Console with Google Map + Telemetry) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left/Main Column: Google Maps Style Map of Singapore (7 cols) */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                    <span>Singapore Spatial Air Map</span>
                  </div>
                  
                  {/* Map Style View Switcher */}
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 text-[11px]">
                    <button
                      onClick={() => setMapPresentation('google')}
                      className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                        mapPresentation === 'google'
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <Map className="w-3 h-3" />
                      <span>Google Map Style</span>
                    </button>
                    <button
                      onClick={() => setMapPresentation('vector')}
                      className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                        mapPresentation === 'vector'
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <Layers className="w-3 h-3" />
                      <span>Choropleth Sectors</span>
                    </button>
                  </div>
                </div>

                {mapPresentation === 'google' ? (
                  <GoogleMapsStyleMap
                    airState={airState}
                    selectedRegion={selectedRegion}
                    onSelectRegion={setSelectedRegion}
                    metricType={metricType}
                    onMetricChange={setMetricType}
                    unhealthyThreshold={alertConfig.psiThreshold}
                    theme={theme}
                  />
                ) : (
                  <SingaporeMap
                    airState={airState}
                    selectedRegion={selectedRegion}
                    onSelectRegion={setSelectedRegion}
                    metricType={metricType}
                    onMetricChange={setMetricType}
                    unhealthyThreshold={alertConfig.psiThreshold}
                  />
                )}
              </div>

              {/* Right Column: Key Metrics & 6-Pollutant Breakdown (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <MetricsOverview
                  airState={airState}
                  selectedRegion={selectedRegion}
                  onSelectRegion={setSelectedRegion}
                  onFocusMap={() => {}}
                />
              </div>
            </div>

            {/* Historical Telemetry & Trend Chart */}
            <HistoricalTrendChart
              trendData={trendData}
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
              unhealthyThreshold={alertConfig.psiThreshold}
            />

            {/* Health Advisory Snapshot */}
            <HealthAdvisoryGuide
              currentBand={airState.regions[selectedRegion].band}
            />
          </div>
        )}

        {/* Tab 2: Dedicated Google Map View */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Google Map Style Singapore PSI Telemetry
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Interactive Google Maps cartography with expressway network (PIE, AYE, CTE), nature reserves, teardrop monitoring pins, and smoke dispersion layers.
                </p>
              </div>

              {/* Map presentation toggle */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setMapPresentation('google')}
                  className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                    mapPresentation === 'google'
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Map className="w-3.5 h-3.5" />
                  <span>Google Map Style</span>
                </button>
                <button
                  onClick={() => setMapPresentation('vector')}
                  className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                    mapPresentation === 'vector'
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Sector Boundary Map</span>
                </button>
              </div>
            </div>

            {mapPresentation === 'google' ? (
              <GoogleMapsStyleMap
                airState={airState}
                selectedRegion={selectedRegion}
                onSelectRegion={setSelectedRegion}
                metricType={metricType}
                onMetricChange={setMetricType}
                unhealthyThreshold={alertConfig.psiThreshold}
                theme={theme}
              />
            ) : (
              <SingaporeMap
                airState={airState}
                selectedRegion={selectedRegion}
                onSelectRegion={setSelectedRegion}
                metricType={metricType}
                onMetricChange={setMetricType}
                unhealthyThreshold={alertConfig.psiThreshold}
              />
            )}

            <MetricsOverview
              airState={airState}
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
              onFocusMap={() => {}}
            />
          </div>
        )}

        {/* Tab 3: Dedicated 24H Telemetry Trends */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            <HistoricalTrendChart
              trendData={trendData}
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
              unhealthyThreshold={alertConfig.psiThreshold}
            />
            <MetricsOverview
              airState={airState}
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
              onFocusMap={() => setActiveTab('map')}
            />
          </div>
        )}

        {/* Tab 4: Health Advisory Guide */}
        {activeTab === 'advisory' && (
          <div className="space-y-6">
            <HealthAdvisoryGuide
              currentBand={airState.regions[selectedRegion].band}
            />
          </div>
        )}
      </main>

      {/* Push Notification and Threshold Alert Modal */}
      <AlertThresholdModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        config={alertConfig}
        onSaveConfig={handleSaveConfig}
        alertHistory={alertHistory}
        onClearHistory={handleClearHistory}
        onTriggerTestAlert={handleTriggerTestAlert}
      />

      {/* Clean Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 pt-6 pb-24 md:pb-6 text-xs text-slate-500 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-300">SG AirWatch</span>
            <span>·</span>
            <span>Data provided via Singapore National Environment Agency (NEA) & data.gov.sg</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
            <span>PSI Threshold: {alertConfig.psiThreshold}</span>
            <span>·</span>
            <span>PM2.5 Threshold: {alertConfig.pm25Threshold} µg/m³</span>
            <span>·</span>
            <button
              onClick={() => setIsAlertModalOpen(true)}
              className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors underline"
            >
              Alert Settings
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
