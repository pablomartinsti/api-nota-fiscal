import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { errorHandler } from './error-handler.middleware';

describe('errorHandler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve retornar 500 sem expor detalhes de erros inesperados', async () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const app = express();

    app.get('/erro', async () => {
      throw new Error('Detalhe interno que não deve ser exposto.');
    });
    app.use(errorHandler);

    const response = await request(app).get('/erro');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: 'Erro interno do servidor.',
    });
    expect(response.text).not.toContain('Detalhe interno');
    expect(error).toHaveBeenCalledOnce();

    const payload = JSON.parse(error.mock.calls[0][0] as string);
    expect(payload.evento).toBe('erro_inesperado');
    expect(payload.contexto.errorMessage).toBe(
      'Detalhe interno que não deve ser exposto.',
    );
  });
});
