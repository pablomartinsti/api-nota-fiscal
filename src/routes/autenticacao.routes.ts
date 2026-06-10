import { Router } from 'express';

import {
  criarAutenticacaoMiddleware,
  criarAutenticarUsuarioController,
  criarObterPerfilAutenticadoController,
} from '../factories/AutenticacaoFactory';

const autenticacaoRoutes = Router();
const autenticarUsuarioController = criarAutenticarUsuarioController();
const autenticacaoMiddleware = criarAutenticacaoMiddleware();
const obterPerfilAutenticadoController = criarObterPerfilAutenticadoController();

autenticacaoRoutes.post('/sessoes', (request, response) =>
  autenticarUsuarioController.handle(request, response),
);
autenticacaoRoutes.get(
  '/me',
  (request, response, next) =>
    autenticacaoMiddleware.handle(request, response, next),
  (request, response) =>
    obterPerfilAutenticadoController.handle(request, response),
);

export { autenticacaoRoutes };
