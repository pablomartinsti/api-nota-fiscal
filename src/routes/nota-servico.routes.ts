import { Router } from 'express';

import { criarAutenticacaoMiddleware } from '../factories/AutenticacaoFactory';
import { criarGestaoNotaServicoController } from '../factories/GestaoNotaServicoFactory';

const notaServicoRoutes = Router();
const autenticacaoMiddleware = criarAutenticacaoMiddleware();
const controller = criarGestaoNotaServicoController();

notaServicoRoutes.use((request, response, next) =>
  autenticacaoMiddleware.handle(request, response, next),
);
notaServicoRoutes.post('/notas-servico', (request, response) =>
  controller.cadastrar(request, response),
);
notaServicoRoutes.get('/notas-servico', (request, response) =>
  controller.listar(request, response),
);
notaServicoRoutes.get('/notas-servico/:notaId', (request, response) =>
  controller.buscar(request, response),
);
notaServicoRoutes.put('/notas-servico/:notaId', (request, response) =>
  controller.atualizar(request, response),
);

export { notaServicoRoutes };
