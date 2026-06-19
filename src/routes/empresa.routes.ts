import { Router } from 'express';

import { PerfilUsuario } from '../entities/Usuario';
import { criarAutenticacaoMiddleware } from '../factories/AutenticacaoFactory';
import { criarGestaoEmpresaController } from '../factories/GestaoEmpresaFactory';
import { AutorizacaoPerfilMiddleware } from '../middleware/autorizacao-perfil.middleware';

const empresaRoutes = Router();
const autenticacaoMiddleware = criarAutenticacaoMiddleware();
const donoMiddleware = new AutorizacaoPerfilMiddleware([PerfilUsuario.DONO]);
const controller = criarGestaoEmpresaController();

empresaRoutes.use('/empresa', (request, response, next) =>
  autenticacaoMiddleware.handle(request, response, next),
);
empresaRoutes.get('/empresa', (request, response) =>
  controller.buscar(request, response),
);
empresaRoutes.get('/empresa/configuracao-fiscal', (request, response) =>
  controller.buscarConfiguracaoFiscal(request, response),
);
empresaRoutes.put(
  '/empresa/configuracao-fiscal',
  (request, response, next) => donoMiddleware.handle(request, response, next),
  (request, response) =>
    controller.atualizarConfiguracaoFiscal(request, response),
);
empresaRoutes.post(
  '/empresa/configuracao-fiscal/certificado-a1',
  (request, response, next) => donoMiddleware.handle(request, response, next),
  (request, response) =>
    controller.configurarCertificadoA1(request, response),
);
empresaRoutes.put(
  '/empresa',
  (request, response, next) => donoMiddleware.handle(request, response, next),
  (request, response) => controller.atualizar(request, response),
);

export { empresaRoutes };
