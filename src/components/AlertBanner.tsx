import React from 'react';
import { AlertTriangle, Bell, X, ShieldAlert, ArrowRight } from 'lucide-react';
import { TriggeredAlert } from '../types/airQuality';

interface AlertBannerProps {
  activeAlert: TriggeredAlert | null;
  onDismiss: () => void;
  onOpenAdvisory: () => void;
  onOpenAlertModal: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  activeAlert,
  onDismiss,
  onOpenAdvisory,
  onOpenAlertModal,
}) => {
  if (!activeAlert) return null;

  const isCritical = activeAlert.value >= 201;

  return (
    <div
      role="alert"
      className={`relative w-full border-b transition-all ${
        isCritical
          ? 'bg-red-950/90 border-red-700 text-red-100'
          : 'bg-amber-950/80 border-amber-600/70 text-amber-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-1.5 rounded-lg shrink-0 ${
              isCritical ? 'bg-red-600 text-white' : 'bg-amber-500 text-slate-950'
            }`}
          >
            {isCritical ? (
              <ShieldAlert className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="text-xs font-mono font-semibold tracking-wide uppercase opacity-90">
              Singapore Air Quality Alert · {activeAlert.regionDisplayName} Sector
            </div>
            <div className="text-sm font-medium">
              {activeAlert.message}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium ml-auto">
          <button
            onClick={onOpenAdvisory}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black/30 hover:bg-black/50 transition-colors border border-white/10"
          >
            <span>View Health Advice</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenAlertModal}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black/30 hover:bg-black/50 transition-colors border border-white/10"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alert Settings</span>
          </button>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg hover:bg-black/30 text-white/70 hover:text-white transition-colors"
            title="Dismiss Alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
