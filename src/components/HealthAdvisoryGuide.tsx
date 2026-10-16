import React from 'react';
import { AirQualityBand } from '../types/airQuality';
import { Shield, HeartPulse, Wind } from 'lucide-react';

interface HealthAdvisoryGuideProps {
  currentBand: AirQualityBand;
}

export const HealthAdvisoryGuide: React.FC<HealthAdvisoryGuideProps> = ({ currentBand }) => {
  const bands: {
    band: AirQualityBand;
    range: string;
    healthy: string;
    elderly: string;
    chronic: string;
  }[] = [
    {
      band: 'Good',
      range: '0 – 50 PSI',
      healthy: 'Normal outdoor activities may be carried out.',
      elderly: 'Normal outdoor activities may be carried out.',
      chronic: 'Normal outdoor activities may be carried out.',
    },
    {
      band: 'Moderate',
      range: '51 – 100 PSI',
      healthy: 'Normal outdoor activities may continue.',
      elderly: 'Normal outdoor activities may continue.',
      chronic: 'Normal outdoor activities; stay prepared with reliever medication if asthmatic.',
    },
    {
      band: 'Unhealthy',
      range: '101 – 200 PSI',
      healthy: 'Reduce prolonged or strenuous outdoor physical exertion.',
      elderly: 'Minimize prolonged or strenuous outdoor physical exertion.',
      chronic: 'Avoid prolonged or strenuous outdoor physical exertion. Seek medical advice if unwell.',
    },
    {
      band: 'Very Unhealthy',
      range: '201 – 300 PSI',
      healthy: 'Avoid prolonged or strenuous outdoor physical exertion.',
      elderly: 'Avoid outdoor physical exertion. Stay indoors in air-conditioned areas.',
      chronic: 'Avoid all outdoor activity. Keep windows closed and operate air cleaner with HEPA filter.',
    },
    {
      band: 'Hazardous',
      range: '> 300 PSI',
      healthy: 'Minimize all outdoor activity. Wear fitted N95 respirator if outdoor transit is unavoidable.',
      elderly: 'Stay strictly indoors. Vulnerable persons should avoid any outdoor exposure.',
      chronic: 'Stay strictly indoors. Continuous air filtration recommended. Seek immediate emergency care if breathing difficulty occurs.',
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-lg space-y-6 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <span>Singapore MOH & NEA Official Health Advisory</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Calibrated guidelines by Ministry of Health (MOH) for outdoor physical exertion and respiratory protection.
          </p>
        </div>
        <div className="text-xs font-mono text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 px-3 py-1 rounded-lg">
          Active Status: <strong className="text-slate-900 dark:text-white">{currentBand}</strong>
        </div>
      </div>

      {/* Advisory Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono uppercase text-[11px]">
              <th className="py-3 px-3">Air Quality Band</th>
              <th className="py-3 px-3">Healthy Individuals</th>
              <th className="py-3 px-3">Elderly, Pregnant & Children</th>
              <th className="py-3 px-3">Chronic Lung/Heart Conditions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
            {bands.map((row) => {
              const isCurrent = row.band === currentBand;
              return (
                <tr
                  key={row.band}
                  className={`transition-colors ${
                    isCurrent
                      ? 'bg-blue-50/80 dark:bg-cyan-950/20 text-slate-900 dark:text-white font-medium ring-1 ring-blue-400/40 dark:ring-cyan-500/30'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <td className="py-3.5 px-3">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>{row.band}</span>
                      {isCurrent && (
                        <span className="text-[10px] bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-mono px-1.5 py-0.2 rounded font-bold">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                      {row.range}
                    </div>
                  </td>
                  <td className="py-3.5 px-3">{row.healthy}</td>
                  <td className="py-3.5 px-3">{row.elderly}</td>
                  <td className="py-3.5 px-3">{row.chronic}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Practical Protection Guidelines: N95 vs Surgical Mask, Air Cleaners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-200">
            <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>N95 Mask Advisory for Singapore Haze</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Surgical masks and cloth masks <strong>do not filter</strong> fine PM2.5 haze particles. Only fitted <strong>N95 respirators</strong> certified by NIOSH or equivalent are effective during Unhealthy or Hazardous haze spells.
          </p>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1">
            * Pregnant women and individuals with reduced lung capacity should consult physicians prior to prolonged N95 wear.
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-200">
            <Wind className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Indoor Ventilation & Air Cleaners</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Keep doors and windows closed during transboundary haze surges. Operate split-unit air conditioners on recirculation mode and run portable air purifiers fitted with <strong>True HEPA filters</strong>.
          </p>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1">
            * Check Clean Air Delivery Rate (CADR) matches room size ($m^2$).
          </div>
        </div>
      </div>
    </div>
  );
};
