import type { Request, Response } from 'express';

const DATA_GOV_SG_PSI_URL = 'https://api-open.data.gov.sg/v2/real-time/api/psi';

export interface DataGovSgPsiResponse {
  code: number;
  data: {
    regionMetadata: Array<{
      name: string;
      labelLocation: {
        latitude: number;
        longitude: number;
      };
    }>;
    items: Array<{
      date: string;
      updatedTimestamp: string;
      timestamp: string;
      readings: Record<string, Record<string, number>>;
    }>;
  };
  errorMsg?: string;
}

export function getPsiBand(psi: number): string {
  if (psi <= 50) return 'Good';
  if (psi <= 100) return 'Moderate';
  if (psi <= 200) return 'Unhealthy';
  if (psi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

/**
 * Serverless endpoint for pulling live Singapore PSI telemetry from data.gov.sg
 * Endpoint: GET /api/psi
 * Upstream: GET https://api-open.data.gov.sg/v2/real-time/api/psi
 * No API key required.
 */
export default async function handler(req: Request, res: Response) {
  // CORS & Cache Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only GET requests are supported.',
    });
  }

  try {
    const upstreamResponse = await fetch(DATA_GOV_SG_PSI_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!upstreamResponse.ok) {
      throw new Error(
        `Upstream data.gov.sg returned HTTP ${upstreamResponse.status}: ${upstreamResponse.statusText}`
      );
    }

    const payload: DataGovSgPsiResponse = await upstreamResponse.json();

    // Check if client requested raw unformatted upstream data
    const format = req.query?.format;
    if (format === 'raw') {
      return res.status(200).json(payload);
    }

    const item = payload.data?.items?.[0];
    const readings = item?.readings || {};
    const psiMap = readings['psi_twenty_four_hourly'] || {};
    const pm25Map = readings['pm25_twenty_four_hourly'] || {};
    const pm10Map = readings['pm10_twenty_four_hourly'] || {};
    const o3Map = readings['o3_eight_hour_max'] || {};
    const no2Map = readings['no2_one_hour_max'] || {};
    const so2Map = readings['so2_twenty_four_hourly'] || {};
    const coMap = readings['co_eight_hour_max'] || {};

    const sectors = ['north', 'south', 'east', 'west', 'central'];
    const validPsiValues = sectors.map((s) => psiMap[s]).filter((v): v is number => typeof v === 'number');

    // Compute islandwide national metrics
    const nationalPsi =
      validPsiValues.length > 0
        ? Math.round(validPsiValues.reduce((a, b) => a + b, 0) / validPsiValues.length)
        : 50;

    const maxPsi = validPsiValues.length > 0 ? Math.max(...validPsiValues) : nationalPsi;
    const peakSector = sectors.find((s) => psiMap[s] === maxPsi) || 'islandwide';

    const normalizedSectors: Record<string, any> = {};
    sectors.forEach((sec) => {
      const psi = psiMap[sec] ?? 50;
      normalizedSectors[sec] = {
        sector: sec,
        psi24h: psi,
        pm25_24h: pm25Map[sec] ?? Math.round(psi * 0.55),
        pm10_24h: pm10Map[sec] ?? Math.round(psi * 0.7),
        o3_8h: o3Map[sec] ?? 20,
        no2_1h: no2Map[sec] ?? 18,
        so2_24h: so2Map[sec] ?? 6,
        co_8h: coMap[sec] ?? 0.5,
        band: getPsiBand(psi),
        isUnhealthy: psi >= 101,
      };
    });

    return res.status(200).json({
      status: 'success',
      source: DATA_GOV_SG_PSI_URL,
      date: item?.date || new Date().toISOString().split('T')[0],
      timestamp: item?.timestamp || new Date().toISOString(),
      updatedTimestamp: item?.updatedTimestamp || new Date().toISOString(),
      summary: {
        nationalPsi,
        nationalBand: getPsiBand(nationalPsi),
        maxPsi,
        peakSector,
        isUnhealthySpike: maxPsi >= 101,
      },
      sectors: normalizedSectors,
      raw: payload,
    });
  } catch (err: any) {
    console.error('Error fetching data.gov.sg v2 PSI data:', err);
    return res.status(502).json({
      status: 'error',
      message: 'Failed to fetch real-time PSI data from data.gov.sg',
      details: err?.message || String(err),
      endpoint: DATA_GOV_SG_PSI_URL,
    });
  }
}
