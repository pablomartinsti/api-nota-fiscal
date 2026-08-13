import { Router } from 'express';

import { PerfilUsuario } from '../entities/Usuario';
import { criarAutenticacaoMiddleware } from '../factories/AutenticacaoFactory';
import { criarAdminOperacionalController } from '../factories/AdminOperacionalFactory';
import { AutorizacaoPerfilMiddleware } from '../middleware/autorizacao-perfil.middleware';

const adminOperacionalRoutes = Router();
const autenticacaoMiddleware = criarAutenticacaoMiddleware();
const adminSistemaMiddleware = new AutorizacaoPerfilMiddleware([
  PerfilUsuario.ADMIN_SISTEMA,
]);
const controller = criarAdminOperacionalController();

adminOperacionalRoutes.use('/admin', (request, response, next) =>
  autenticacaoMiddleware.handle(request, response, next),
);
adminOperacionalRoutes.use('/admin', (request, response, next) =>
  adminSistemaMiddleware.handle(request, response, next),
);
adminOperacionalRoutes.get('/admin/empresas', (request, response) =>
  controller.listarEmpresas(request, response),
);
adminOperacionalRoutes.patch(
  '/admin/empresas/:empresaId/emissao',
  (request, response) =>
    controller.atualizarEmissaoEmpresa(request, response),
);
adminOperacionalRoutes.patch(
  '/admin/empresas/:empresaId/configuracao-fiscal',
  (request, response) =>
    controller.atualizarConfiguracaoFiscalEmpresa(request, response),
);
adminOperacionalRoutes.get('/admin/notas', (request, response) =>
  controller.listarNotas(request, response),
);
adminOperacionalRoutes.get('/admin/eventos-fiscais', (request, response) =>
  controller.listarEventosFiscais(request, response),
);

export { adminOperacionalRoutes };
