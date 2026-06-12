import { Router } from 'express';

import { criarAutenticacaoMiddleware } from '../factories/AutenticacaoFactory';
import { criarGestaoClienteController } from '../factories/GestaoClienteFactory';

const clienteRoutes = Router();
const autenticacaoMiddleware = criarAutenticacaoMiddleware();
const controller = criarGestaoClienteController();

clienteRoutes.use((request, response, next) =>
  autenticacaoMiddleware.handle(request, response, next),
);
clienteRoutes.post('/clientes', (request, response) =>
  controller.cadastrar(request, response),
);
clienteRoutes.get('/clientes', (request, response) =>
  controller.listar(request, response),
);
clienteRoutes.get('/clientes/:clienteId', (request, response) =>
  controller.buscar(request, response),
);
clienteRoutes.put('/clientes/:clienteId', (request, response) =>
  controller.atualizar(request, response),
);
clienteRoutes.patch('/clientes/:clienteId/status', (request, response) =>
  controller.alterarStatus(request, response),
);

export { clienteRoutes };
