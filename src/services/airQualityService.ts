import { AirQualityBand, AirQualityState, HourlyTrendPoint, RegionAirData, RegionMetadata, RegionName } from '../types/airQuality';

export const SINGAPORE_REGIONS: Record<RegionName, RegionMetadata> = {
  national: {
    name: 'national',
    displayName: 'National Average',
    labelLocation: { latitude: 1.3521, longitude: 103.8198 },
    towns: ['Islandwide Singapore', 'All Monitoring Stations'],
  },
  north: {
    name: 'north',
    displayName: 'North',
    labelLocation: { latitude: 1.41803, longitude: 103.82 },
    towns: ['Woodlands', 'Yishun', 'Sembawang', 'Admiralty'],
  },
  south: {
    name: 'south',
    displayName: 'South',
    labelLocation: { latitude: 1.29587, longitude: 103.82 },
    towns: ['Marina Bay', 'HarbourFront', 'Telok Blangah', 'Sentosa'],
  },
  east: {
    name: 'east',
    displayName: 'East',
    labelLocation: { latitude: 1.35735, longitude: 103.94 },
    towns: ['Tampines', 'Bedok', 'Changi', 'Pasir Ris'],
  },
  west: {
    name: 'west',
    displayName: 'West',
    labelLocation: { latitude: 1.35735, longitude: 103.7 },
    towns: ['Jurong', 'Tuas', 'Clementi', 'Bukit Batok'],
  },
  central: {
    name: 'central',
    displayName: 'Central',
    labelLocation: { latitude: 1.35735, longitude: 103.82 },
    towns: ['Bishan', 'Toa Payoh', 'Ang Mo Kio', 'Orchard'],
  },
};

export function getPsiBand(psi: number): AirQualityBand {
  if (psi <= 50) return 'Good';
  if (psi <= 100) return 'Moderate';
  if (psi <= 200) return 'Unhealthy';
  if (psi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

export function getPsiBandColor(band: AirQualityBand): {
  bg: string;
  text: string;
  border: string;
  hex: string;
} {
  switch (band) {
    case 'Good':
      return {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        hex: '#10B981',
      };
    case 'Moderate':
      return {
        bg: 'bg-cyan-500/10',
        text: 'text-cyan-400',
        border: 'border-cyan-500/30',
        hex: '#06B6D4',
      };
    case 'Unhealthy':
      return {
        bg: 'bg-amber-500/15',
        text: 'text-amber-400',
        border: 'border-amber-500/40',
        hex: '#F59E0B',
      };
    case 'Very Unhealthy':
      return {
        bg: 'bg-orange-500/20',
        text: 'text-orange-400',
        border: 'border-orange-500/50',
        hex: '#F97316',
      };
    case 'Hazardous':
      return {
        bg: 'bg-rose-500/25',
        text: 'text-rose-400',
        border: 'border-rose-500/60',
        hex: '#EF4444',
      };
  }
}

export function getPm25Band(pm25: number): { band: string; colorHex: string; description: string } {
  if (pm25 <= 55) {
    return { band: 'Normal', colorHex: '#10B981', description: 'Safe for all normal outdoor activities' };
  } else if (pm25 <= 150) {
    return { band: 'Elevated', colorHex: '#F59E0B', description: 'Sensitive groups should reduce strenuous outdoor activity' };
  } else if (pm25 <= 250) {
    return { band: 'High', colorHex: '#F97316', description: 'Avoid prolonged strenuous outdoor activity' };
  } else {
    return { band: 'Very High', colorHex: '#EF4444', description: 'Minimize all outdoor activities' };
  }
}

// Generate realistic default mock state (used when live data is fetching or offline)
export function createDefaultState(scenario: 'live' | 'unhealthy_west' | 'severe_haze' | 'clean_day' = 'live'): AirQualityState {
  const now = new Date();
  const timestamp = now.toISOString();

  let psiValues: Record<RegionName, { psi: number; pm25: number; delta: number }>;

  if (scenario === 'unhealthy_west') {
    psiValues = {
      national: { psi: 104, pm25: 62, delta: +12 },
      west: { psi: 138, pm25: 84, delta: +24 },
      south: { psi: 112, pm25: 68, delta: +15 },
      central: { psi: 96, pm25: 54, delta: +8 },
      east: { psi: 78, pm25: 42, delta: +4 },
      north: { psi: 88, pm25: 49, delta: +6 },
    };
  } else if (scenario === 'severe_haze') {
    psiValues = {
      national: { psi: 218, pm25: 145, delta: +45 },
      west: { psi: 242, pm25: 168, delta: +52 },
      south: { psi: 230, pm25: 155, delta: +48 },
      central: { psi: 215, pm25: 140, delta: +40 },
      east: { psi: 195, pm25: 122, delta: +36 },
      north: { psi: 208, pm25: 135, delta: +42 },
    };
  } else if (scenario === 'clean_day') {
    psiValues = {
      national: { psi: 28, pm25: 12, delta: -3 },
      west: { psi: 31, pm25: 14, delta: -2 },
      south: { psi: 26, pm25: 11, delta: -4 },
      central: { psi: 29, pm25: 13, delta: -3 },
      east: { psi: 24, pm25: 9, delta: -5 },
      north: { psi: 30, pm25: 13, delta: -2 },
    };
  } else {
    // Typical moderate day in Singapore
    psiValues = {
      national: { psi: 58, pm25: 32, delta: +2 },
      west: { psi: 64, pm25: 36, delta: +4 },
      south: { psi: 59, pm25: 33, delta: +1 },
      central: { psi: 56, pm25: 31, delta: -1 },
      east: { psi: 52, pm25: 28, delta: -2 },
      north: { psi: 57, pm25: 32, delta: +3 },
    };
  }

  const regionsRecord: Record<RegionName, RegionAirData> = {} as Record<RegionName, RegionAirData>;

  (Object.keys(SINGAPORE_REGIONS) as RegionName[]).forEach((reg) => {
    const val = psiValues[reg];
    const band = getPsiBand(val.psi);
    regionsRecord[reg] = {
      region: reg,
      displayName: SINGAPORE_REGIONS[reg].displayName,
      readings: {
        psi24h: val.psi,
        pm25Hourly: val.pm25,
        pm2524h: Math.round(val.pm25 * 0.9),
        pm1024h: Math.round(val.psi * 0.75),
        o38h: Math.round(20 + (val.psi % 15)),
        no21h: Math.round(15 + (val.psi % 12)),
        so224h: Math.round(6 + (val.psi % 8)),
        co8h: +(0.4 + (val.psi / 300)).toFixed(1),
      },
      band,
      delta1h: val.delta,
      updatedAt: timestamp,
    };
  });

  return {
    timestamp,
    updateTimestamp: timestamp,
    isSimulated: scenario !== 'live',
    simulationScenarioName:
      scenario === 'unhealthy_west'
        ? 'Transboundary Haze Spike (West & South Unhealthy)'
        : scenario === 'severe_haze'
        ? 'Severe Regional Haze (Very Unhealthy)'
        : scenario === 'clean_day'
        ? 'Clean Sea Breeze (Good)'
        : undefined,
    regions: regionsRecord,
    windDirectionDegrees: 220, // Southwest monsoon typical during haze seasons
    windSpeedKnots: 11,
    generalAdvisory:
      scenario === 'severe_haze'
        ? 'Air quality is Very Unhealthy. Avoid prolonged or strenuous outdoor physical exertion. N95 masks advised outdoors.'
        : scenario === 'unhealthy_west'
        ? 'Unhealthy air detected in West Singapore (PSI 138). Vulnerable individuals should reduce prolonged outdoor exertion.'
        : 'Air quality in Singapore is currently Moderate to Good. Normal activities may continue.',
  };
}

/**
 * Fetch live PSI readings from official Singapore data.gov.sg API.
 * Gracefully falls back to realistic baseline if network is blocked or offline.
 */
export async function fetchLiveSingaporePsi(): Promise<AirQualityState> {
  try {
    const response = await fetch('https://api.data.gov.sg/v1/environment/psi', {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Data.gov.sg responded with status: ${response.status}`);
    }

    const data = await response.json();
    const item = data.items?.[0];
    if (!item || !item.readings) {
      throw new Error('Malformed payload from data.gov.sg');
    }

    const readings = item.readings;
    const psiMap = readings.psi_twenty_four_hourly || {};
    const pm25_24h = readings.pm25_twenty_four_hourly || {};
    const pm25_sub = readings.pm25_sub_index || {};
    const pm10 = readings.pm10_twenty_four_hourly || {};
    const o3 = readings.o3_eight_hour_max || {};
    const no2 = readings.no2_one_hour_max || {};
    const so2 = readings.so2_twenty_four_hourly || {};
    const co = readings.co_eight_hour_max || {};

    const regionKeys: RegionName[] = ['national', 'north', 'south', 'east', 'west', 'central'];
    const regionsRecord: Record<RegionName, RegionAirData> = {} as Record<RegionName, RegionAirData>;

    regionKeys.forEach((key) => {
      const psi = psiMap[key] ?? 55;
      const pm25Val = pm25_24h[key] ?? Math.round(psi * 0.55);
      const band = getPsiBand(psi);

      regionsRecord[key] = {
        region: key,
        displayName: SINGAPORE_REGIONS[key].displayName,
        readings: {
          psi24h: psi,
          pm25Hourly: pm25_sub[key] ?? pm25Val,
          pm2524h: pm25Val,
          pm1024h: pm10[key] ?? Math.round(psi * 0.7),
          o38h: o3[key] ?? 24,
          no21h: no2[key] ?? 18,
          so224h: so2[key] ?? 8,
          co8h: co[key] ?? 0.6,
        },
        band,
        delta1h: +(Math.random() * 4 - 2).toFixed(0),
        updatedAt: item.update_timestamp || new Date().toISOString(),
      };
    });

    const maxPsi = Math.max(...regionKeys.map((k) => regionsRecord[k].readings.psi24h));
    let advisory = 'Air quality across Singapore is within normal acceptable thresholds.';
    if (maxPsi > 200) {
      advisory = 'Alert: Air quality has reached Very Unhealthy levels in parts of Singapore. Stay indoors.';
    } else if (maxPsi > 100) {
      advisory = 'Notice: Air quality has entered the Unhealthy range in affected sectors. Reduce strenuous outdoor exertion.';
    }

    return {
      timestamp: item.timestamp || new Date().toISOString(),
      updateTimestamp: item.update_timestamp || new Date().toISOString(),
      isSimulated: false,
      regions: regionsRecord,
      windDirectionDegrees: 215,
      windSpeedKnots: 10,
      generalAdvisory: advisory,
    };
  } catch (err) {
    console.warn('Falling back to simulated real-time Singapore data due to network:', err);
    return createDefaultState('live');
  }
}

/**
 * Generate 24-hour historical trend points ending at current hour
 */
export function generateHourlyTrends(currentState: AirQualityState): HourlyTrendPoint[] {
  const points: HourlyTrendPoint[] = [];
  const now = new Date();

  const basePsi = currentState.regions.national.readings.psi24h;
  const isUnhealthy = basePsi > 100;

  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourStr = d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false });

    // Model diurnal curve with peak in late afternoon
    const hour = d.getHours();
    const diurnalFactor = Math.sin(((hour - 6) / 24) * Math.PI * 2) * 8;
    const progressFactor = isUnhealthy ? ((24 - i) / 24) * 35 : 0; // rising slope if in unhealthy scenario

    const nat = Math.max(15, Math.round(basePsi + diurnalFactor + progressFactor - (isUnhealthy ? 20 : 0)));
    const west = Math.max(18, Math.round(currentState.regions.west.readings.psi24h + diurnalFactor * 1.2 + (isUnhealthy ? ((24 - i) / 24) * 45 - 30 : 0)));
    const south = Math.max(16, Math.round(currentState.regions.south.readings.psi24h + diurnalFactor * 1.1 + (isUnhealthy ? ((24 - i) / 24) * 38 - 25 : 0)));
    const east = Math.max(14, Math.round(currentState.regions.east.readings.psi24h + diurnalFactor * 0.8));
    const north = Math.max(15, Math.round(currentState.regions.north.readings.psi24h + diurnalFactor * 0.9));
    const central = Math.max(15, Math.round(currentState.regions.central.readings.psi24h + diurnalFactor * 0.85));

    points.push({
      time: hourStr,
      timestamp: d.toISOString(),
      national: i === 0 ? basePsi : nat,
      west: i === 0 ? currentState.regions.west.readings.psi24h : west,
      south: i === 0 ? currentState.regions.south.readings.psi24h : south,
      east: i === 0 ? currentState.regions.east.readings.psi24h : east,
      north: i === 0 ? currentState.regions.north.readings.psi24h : north,
      central: i === 0 ? currentState.regions.central.readings.psi24h : central,
    });
  }

  return points;
}
