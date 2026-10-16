import { AlertConfig, RegionName, TriggeredAlert } from '../types/airQuality';

const CONFIG_STORAGE_KEY = 'sg_airwatch_alert_config';
const HISTORY_STORAGE_KEY = 'sg_airwatch_alert_history';

export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  enabled: true,
  psiThreshold: 101, // Standard NEA Unhealthy threshold
  pm25Threshold: 56, // Elevated threshold
  selectedRegions: [], // empty = all regions
  soundEnabled: true,
  browserPushGranted: typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted',
  alertIntervalMinutes: 15,
};

let audioCtx: AudioContext | null = null;

/**
 * Play a synthetic two-tone chime via Web Audio API without needing external audio assets
 */
export function playSyntheticAlertSound(severity: 'warning' | 'critical' = 'warning') {
  try {
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return;

    if (!audioCtx || audioCtx.state === 'suspended') {
      audioCtx = new AudioCtxClass();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = severity === 'critical' ? 'sawtooth' : 'sine';

    if (severity === 'critical') {
      // Rapid warning double beep
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(660, now + 0.15);
      osc.frequency.setValueAtTime(880, now + 0.3);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } else {
      // Gentle double chime (D5 -> A5)
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    }
  } catch (err) {
    console.warn('AudioContext playback error:', err);
  }
}

/**
 * Request native browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (e) {
    console.error('Failed to request notification permission:', e);
    return false;
  }
}

/**
 * Dispatch native system notification with fallback
 */
export function dispatchSystemNotification(title: string, options: NotificationOptions): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: false,
        ...options,
      });
      return true;
    } catch (e) {
      console.warn('Notification instantiation failed:', e);
      return false;
    }
  }
  return false;
}

export function loadAlertConfig(): AlertConfig {
  if (typeof window === 'undefined') return DEFAULT_ALERT_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_ALERT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_ALERT_CONFIG,
      ...parsed,
      browserPushGranted: 'Notification' in window && Notification.permission === 'granted',
    };
  } catch {
    return DEFAULT_ALERT_CONFIG;
  }
}

export function saveAlertConfig(config: AlertConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save alert config:', e);
  }
}

export function loadAlertHistory(): TriggeredAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveAlertHistory(alerts: TriggeredAlert[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(alerts.slice(0, 30)));
  } catch (e) {
    console.error('Failed to save alert history:', e);
  }
}
