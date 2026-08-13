import { Router } from 'express';

import {
  criarAutenticacaoMiddleware,
  criarAutenticarUsuarioController,
  criarGestaoContaController,
  criarObterPerfilAutenticadoController,
} from '../factories/AutenticacaoFactory';

const autenticacaoRoutes = Router();
const autenticarUsuarioController = criarAutenticarUsuarioController();
const autenticacaoMiddleware = criarAutenticacaoMiddleware();
const obterPerfilAutenticadoController = criarObterPerfilAutenticadoController();
const gestaoContaController = criarGestaoContaController();

autenticacaoRoutes.post('/sessoes', (request, response) =>
  autenticarUsuarioController.handle(request, response),
);
autenticacaoRoutes.use('/me', (request, response, next) =>
  autenticacaoMiddleware.handle(request, response, next),
);
autenticacaoRoutes.get('/me', (request, response) =>
  obterPerfilAutenticadoController.handle(request, response),
);
autenticacaoRoutes.put('/me', (request, response) =>
  gestaoContaController.atualizar(request, response),
);
autenticacaoRoutes.put('/me/senha', (request, response) =>
  gestaoContaController.alterarSenha(request, response),
);

export { autenticacaoRoutes };
