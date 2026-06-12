import { Router } from 'express';

import { prisma } from '../database/prisma.client';

const operacionalRoutes = Router();

operacionalRoutes.get('/health', (_request, response) => {
  return response.json({
    status: 'ok',
  });
});

operacionalRoutes.get('/ready', async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return response.json({
      status: 'ready',
    });
  } catch {
    return response.status(503).json({
      status: 'not_ready',
    });
  }
});

export { operacionalRoutes };
