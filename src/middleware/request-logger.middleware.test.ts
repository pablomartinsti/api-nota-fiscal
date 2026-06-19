import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { requestLogger } from './request-logger.middleware';

describe('requestLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve registrar log seguro da requisicao sem incluir body', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const app = express();

    app.use(express.json());
    app.use(requestLogger);
    app.post('/teste', (request, response) => {
      expect(request.body).toEqual({ senha: 'segredo' });
      response.status(201).json({ ok: true });
    });

    await request(app).post('/teste').send({ senha: 'segredo' });

    expect(log).toHaveBeenCalledOnce();
    const payload = JSON.parse(log.mock.calls[0][0] as string);

    expect(payload.evento).toBe('http_request_finalizada');
    expect(payload.contexto).toEqual(
      expect.objectContaining({
        method: 'POST',
        path: '/teste',
        statusCode: 201,
      }),
    );
    expect(JSON.stringify(payload)).not.toContain('segredo');
  });
});
