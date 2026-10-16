export type RegionName = 'national' | 'north' | 'south' | 'east' | 'west' | 'central';

export type AirQualityBand = 'Good' | 'Moderate' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous';

export interface RegionMetadata {
  name: RegionName;
  displayName: string;
  labelLocation: {
    latitude: number;
    longitude: number;
  };
  towns: string[];
}

export interface PollutantReadings {
  psi24h: number;
  pm25Hourly: number;
  pm2524h: number;
  pm1024h: number;
  o38h: number;
  no21h: number;
  so224h: number;
  co8h: number;
}

export interface RegionAirData {
  region: RegionName;
  displayName: string;
  readings: PollutantReadings;
  band: AirQualityBand;
  delta1h: number; // change from previous hour
  updatedAt: string;
}

export interface AirQualityState {
  timestamp: string;
  updateTimestamp: string;
  isSimulated: boolean;
  simulationScenarioName?: string;
  regions: Record<RegionName, RegionAirData>;
  windDirectionDegrees: number; // e.g. 210 for SW monsoon
  windSpeedKnots: number;
  generalAdvisory: string;
}

export interface AlertConfig {
  enabled: boolean;
  psiThreshold: number; // default 101 for Unhealthy
  pm25Threshold: number; // default 56 for Elevated
  selectedRegions: RegionName[]; // empty means all
  soundEnabled: boolean;
  browserPushGranted: boolean;
  alertIntervalMinutes: number;
  lastAlertTimestamp?: string;
}

export interface TriggeredAlert {
  id: string;
  timestamp: string;
  region: RegionName;
  regionDisplayName: string;
  metric: 'PSI' | 'PM2.5';
  value: number;
  threshold: number;
  band: AirQualityBand;
  message: string;
  acknowledged: boolean;
}

export interface HourlyTrendPoint {
  time: string; // "14:00"
  timestamp: string;
  national: number;
  north: number;
  south: number;
  east: number;
  west: number;
  central: number;
}
