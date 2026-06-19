import { RequestHandler } from 'express';

import { logger } from '../observability/logger';

export const requestLogger: RequestHandler = (request, response, next) => {
  const inicio = performance.now();

  response.on('finish', () => {
    const duracaoMs = Math.round(performance.now() - inicio);
    const contexto = {
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
      duracaoMs,
      usuarioId: request.autenticacao?.usuarioId,
      empresaId: request.autenticacao?.empresaId,
      query: request.query,
    };

    if (response.statusCode >= 500) {
      logger.error({
        evento: 'http_request_finalizada',
        contexto,
      });
      return;
    }

    if (response.statusCode >= 400) {
      logger.warn({
        evento: 'http_request_finalizada',
        contexto,
      });
      return;
    }

    logger.info({
      evento: 'http_request_finalizada',
      contexto,
    });
  });

  next();
};
