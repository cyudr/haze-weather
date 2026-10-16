import React, { useState } from 'react';
import { AlertConfig, RegionName, TriggeredAlert } from '../types/airQuality';
import {
  requestNotificationPermission,
  playSyntheticAlertSound,
  dispatchSystemNotification,
} from '../services/notificationService';
import {
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  X,
  Check,
  AlertTriangle,
  Server,
  Code,
  ShieldCheck,
  Send,
  History,
  Trash2,
} from 'lucide-react';

interface AlertThresholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AlertConfig;
  onSaveConfig: (newConfig: AlertConfig) => void;
  alertHistory: TriggeredAlert[];
  onClearHistory: () => void;
  onTriggerTestAlert: () => void;
}

export const AlertThresholdModal: React.FC<AlertThresholdModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  alertHistory,
  onClearHistory,
  onTriggerTestAlert,
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'history' | 'backend'>('settings');
  const [localConfig, setLocalConfig] = useState<AlertConfig>(config);
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermissionState(
      typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
    );
    if (granted) {
      setLocalConfig((prev) => ({ ...prev, browserPushGranted: true, enabled: true }));
      dispatchSystemNotification('SG AirWatch: Notifications Active', {
        body: `You will be alerted when Singapore PSI exceeds ${localConfig.psiThreshold}.`,
      });
    }
  };

  const handleTestSound = () => {
    playSyntheticAlertSound('warning');
  };

  const handleTestSystemPush = () => {
    onTriggerTestAlert();
    setTestNotificationSent(true);
    setTimeout(() => setTestNotificationSent(false), 3000);
  };

  const handleSave = () => {
    onSaveConfig(localConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800 dark:text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Air Quality Alert & Push System</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Singapore Unhealthy PSI & 1-Hr PM2.5 Threshold Notifications
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Alert Settings & Thresholds
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Alert Log</span>
            {alertHistory.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-mono text-slate-700 dark:text-slate-300">
                {alertHistory.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('backend')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'backend'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Serverless Backend Bridge</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'settings' && (
            <>
              {/* Browser Push Permission Card */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                      System Notification Status
                    </span>
                    {permissionState === 'granted' ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <ShieldCheck className="w-3 h-3" /> Granted
                      </span>
                    ) : permissionState === 'denied' ? (
                      <span className="flex items-center gap-1 text-[11px] text-red-400 font-semibold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                        <AlertTriangle className="w-3 h-3" /> Blocked in Browser
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Action Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Receive instant system push notifications even if this tab is in the background when haze strikes.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {permissionState !== 'granted' ? (
                    <button
                      onClick={handleRequestPermission}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-sm"
                    >
                      Enable Browser Push
                    </button>
                  ) : (
                    <button
                      onClick={handleTestSystemPush}
                      className="px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{testNotificationSent ? 'Sent!' : 'Test Push Alert'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Master Alert Enable Switch */}
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <div>
                  <div className="text-sm font-semibold text-slate-200">
                    Active Air Quality Monitoring
                  </div>
                  <div className="text-xs text-slate-400">
                    Continuously evaluate PSI/PM2.5 against thresholds and trigger alerts
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localConfig.enabled}
                    onChange={(e) =>
                      setLocalConfig((prev) => ({ ...prev, enabled: e.target.checked }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              {/* 24-Hour PSI Alert Threshold Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-slate-200 uppercase font-mono tracking-wider">
                      PSI Alert Threshold
                    </label>
                    <p className="text-xs text-slate-400">
                      Standard NEA Unhealthy band begins at <span className="text-amber-400 font-mono font-bold">101 PSI</span>.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-mono font-bold text-amber-400 tabular-nums">
                      {localConfig.psiThreshold}
                    </span>
                    <span className="text-xs font-mono text-slate-400 ml-1">PSI</span>
                  </div>
                </div>

                {/* Preset Threshold Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Moderate (55)', val: 55, desc: 'Early Alert' },
                    { label: 'Sensitive (75)', val: 75, desc: 'Asthma/Elderly' },
                    { label: 'Unhealthy (101)', val: 101, desc: 'Official NEA' },
                    { label: 'Very Unhealthy (201)', val: 201, desc: 'Severe Haze' },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() =>
                        setLocalConfig((prev) => ({ ...prev, psiThreshold: preset.val }))
                      }
                      className={`p-2 rounded-lg text-left border text-xs transition-colors ${
                        localConfig.psiThreshold === preset.val
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-mono">{preset.label}</div>
                      <div className="text-[10px] text-slate-400">{preset.desc}</div>
                    </button>
                  ))}
                </div>

                <input
                  type="range"
                  min="50"
                  max="250"
                  step="5"
                  value={localConfig.psiThreshold}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      psiThreshold: parseInt(e.target.value, 10),
                    }))
                  }
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* 1-Hour PM2.5 Alert Threshold Slider */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-slate-200 uppercase font-mono tracking-wider">
                      1-Hour PM2.5 Rapid Trigger
                    </label>
                    <p className="text-xs text-slate-400">
                      Elevated outdoor risk begins at <span className="text-amber-400 font-mono font-bold">56 µg/m³</span>.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-mono font-bold text-cyan-400 tabular-nums">
                      {localConfig.pm25Threshold}
                    </span>
                    <span className="text-xs font-mono text-slate-400 ml-1">µg/m³</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="35"
                  max="160"
                  step="5"
                  value={localConfig.pm25Threshold}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      pm25Threshold: parseInt(e.target.value, 10),
                    }))
                  }
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              {/* Sector / Region Filter */}
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <label className="text-xs font-semibold text-slate-200 uppercase font-mono tracking-wider">
                  Target Sectors to Monitor
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLocalConfig((prev) => ({ ...prev, selectedRegions: [] }))}
                    className={`px-3 py-2 text-xs rounded-lg border text-left transition-colors ${
                      localConfig.selectedRegions.length === 0
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    All Sectors (Islandwide)
                  </button>
                  {(['west', 'north', 'south', 'east', 'central'] as const).map((reg) => {
                    const isSelected = localConfig.selectedRegions.includes(reg);
                    return (
                      <button
                        key={reg}
                        type="button"
                        onClick={() => {
                          const exists = localConfig.selectedRegions.includes(reg);
                          const next = exists
                            ? localConfig.selectedRegions.filter((r) => r !== reg)
                            : [...localConfig.selectedRegions, reg];
                          setLocalConfig((prev) => ({ ...prev, selectedRegions: next }));
                        }}
                        className={`px-3 py-2 text-xs rounded-lg border text-left capitalize transition-colors ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-semibold'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        {reg} Singapore
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sound Audio Alert Chime */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTestSound}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700"
                    title="Play Test Tone"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      Audio Notification Chime
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Play Web Audio synthetic chime on threshold breach
                    </div>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localConfig.soundEnabled}
                    onChange={(e) =>
                      setLocalConfig((prev) => ({ ...prev, soundEnabled: e.target.checked }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>
            </>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Recent threshold triggers and system alerts stored locally.
                </div>
                {alertHistory.length > 0 && (
                  <button
                    onClick={onClearHistory}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Log</span>
                  </button>
                )}
              </div>

              {alertHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No alerts triggered yet. Click "Test Push Alert" in settings to simulate.
                </div>
              ) : (
                <div className="space-y-2">
                  {alertHistory.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400">
                            {alert.regionDisplayName}: {alert.metric} {alert.value}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            (Threshold: {alert.threshold})
                          </span>
                        </div>
                        <div className="text-slate-300">{alert.message}</div>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                        {new Date(alert.timestamp).toLocaleTimeString('en-SG')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'backend' && (
            <div className="space-y-4 text-xs">
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3.5 text-cyan-200 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span>Ready for Your Future Serverless Backend</span>
                </div>
                <p className="text-cyan-300/80 leading-relaxed">
                  This frontend provides full Web Push API compatibility. When you are ready to connect
                  AWS Lambda, Google Cloud Functions, or Cloudflare Workers, you can ingest the standard payload
                  below to dispatch Web Push via VAPID keys.
                </p>
              </div>

              <div>
                <label className="font-mono font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                  1. Scheduled Serverless Ingestion Target
                </label>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-slate-300 text-[11px] overflow-x-auto">
                  GET https://api.data.gov.sg/v1/environment/psi
                </div>
              </div>

              <div>
                <label className="font-mono font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                  2. Web Push Dispatch Payload Schema (JSON)
                </label>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-cyan-300 text-[11px] overflow-x-auto leading-relaxed">
{`{
  "title": "SG AirWatch: Unhealthy Air Quality Spike",
  "body": "West Singapore PSI reached 124 (Threshold: 101). Limit prolonged outdoor activity.",
  "data": {
    "region": "west",
    "psi": 124,
    "pm25": 78,
    "timestamp": "${new Date().toISOString()}",
    "advisoryLevel": "Unhealthy"
  },
  "icon": "/icon-192.png",
  "badge": "/badge-72.png"
}`}
                </pre>
              </div>

              <div>
                <label className="font-mono font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                  3. Browser Web Push Subscription Hook
                </label>
                <div className="text-slate-400 text-[11px]">
                  Frontend hook <code>navigator.serviceWorker.ready.then(reg =&gt; reg.pushManager.subscribe(&#123; userVisibleOnly: true, applicationServerKey &#125;))</code> is configured to pipe device tokens directly to your future backend database.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
            >
              <Check className="w-4 h-4" />
              <span>Apply Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
