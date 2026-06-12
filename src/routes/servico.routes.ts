import { Router } from 'express';

import { criarAutenticacaoMiddleware } from '../factories/AutenticacaoFactory';
import { criarGestaoServicoController } from '../factories/GestaoServicoFactory';

const servicoRoutes = Router();
const autenticacaoMiddleware = criarAutenticacaoMiddleware();
const controller = criarGestaoServicoController();

servicoRoutes.use((request, response, next) =>
  autenticacaoMiddleware.handle(request, response, next),
);
servicoRoutes.post('/servicos', (request, response) =>
  controller.cadastrar(request, response),
);
servicoRoutes.get('/servicos', (request, response) =>
  controller.listar(request, response),
);
servicoRoutes.get('/servicos/:servicoId', (request, response) =>
  controller.buscar(request, response),
);
servicoRoutes.put('/servicos/:servicoId', (request, response) =>
  controller.atualizar(request, response),
);
servicoRoutes.patch('/servicos/:servicoId/status', (request, response) =>
  controller.alterarStatus(request, response),
);

export { servicoRoutes };
