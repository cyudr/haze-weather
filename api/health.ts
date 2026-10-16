import type { Request, Response } from 'express';

/**
 * Serverless health check endpoint
 * Endpoint: GET /api/health
 */
export default async function handler(req: Request, res: Response) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  return res.status(200).json({
    status: 'healthy',
    service: 'SG AirWatch PSI Service',
    endpoint: 'https://api-open.data.gov.sg/v2/real-time/api/psi',
    serverTime: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
  });
}
