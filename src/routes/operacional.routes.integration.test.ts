import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../app';

describe('Rotas operacionais', () => {
  it('deve informar que o processo da API esta saudavel', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
    });
  });

  it('deve informar que a API esta pronta quando acessar o banco', async () => {
    const response = await request(app).get('/ready');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ready',
    });
  });

  it('deve responder em JSON quando uma rota nao existir', async () => {
    const response = await request(app).get('/rota-inexistente');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: 'Rota nao encontrada.',
    });
  });
});
