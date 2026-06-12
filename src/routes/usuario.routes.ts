import { Router } from 'express';

import { PerfilUsuario } from '../entities/Usuario';
import { criarAutenticacaoMiddleware } from '../factories/AutenticacaoFactory';
import { criarGestaoUsuarioController } from '../factories/GestaoUsuarioFactory';
import { AutorizacaoPerfilMiddleware } from '../middleware/autorizacao-perfil.middleware';

const usuarioRoutes = Router();
const autenticacaoMiddleware = criarAutenticacaoMiddleware();
const gestoresMiddleware = new AutorizacaoPerfilMiddleware([
  PerfilUsuario.DONO,
  PerfilUsuario.ADMIN,
]);
const donoMiddleware = new AutorizacaoPerfilMiddleware([PerfilUsuario.DONO]);
const controller = criarGestaoUsuarioController();

usuarioRoutes.use('/usuarios', (request, response, next) =>
  autenticacaoMiddleware.handle(request, response, next),
);
usuarioRoutes.use('/usuarios', (request, response, next) =>
  gestoresMiddleware.handle(request, response, next),
);

usuarioRoutes.post('/usuarios', (request, response) =>
  controller.cadastrar(request, response),
);
usuarioRoutes.get('/usuarios', (request, response) =>
  controller.listar(request, response),
);
usuarioRoutes.patch(
  '/usuarios/:usuarioId/perfil',
  (request, response, next) => donoMiddleware.handle(request, response, next),
  (request, response) => controller.alterarPerfil(request, response),
);
usuarioRoutes.patch('/usuarios/:usuarioId/status', (request, response) =>
  controller.alterarStatus(request, response),
);

export { usuarioRoutes };
