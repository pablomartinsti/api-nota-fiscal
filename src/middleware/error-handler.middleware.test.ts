import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { errorHandler } from './error-handler.middleware';

describe('errorHandler', () => {
  it('deve retornar 500 sem expor detalhes de erros inesperados', async () => {
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
  });
});
