import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { errorHandler } from './error-handler.middleware';

describe('errorHandler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve retornar 400 para JSON invalido', async () => {
    const app = express();

    app.use(express.json());
    app.post('/json', (_request, response) => response.status(204).send());
    app.use(errorHandler);

    const response = await request(app)
      .post('/json')
      .set('Content-Type', 'application/json')
      .send('{"campo":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: 'JSON da requisicao invalido.',
    });
  });

  it('deve retornar 413 para body maior que o limite configurado', async () => {
    const app = express();

    app.use(express.json({ limit: '10b' }));
    app.post('/json', (_request, response) => response.status(204).send());
    app.use(errorHandler);

    const response = await request(app)
      .post('/json')
      .set('Content-Type', 'application/json')
      .send({ campo: 'conteudo-maior-que-dez-bytes' });

    expect(response.status).toBe(413);
    expect(response.body).toEqual({
      message: 'Corpo da requisicao excede o tamanho maximo permitido.',
    });
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
