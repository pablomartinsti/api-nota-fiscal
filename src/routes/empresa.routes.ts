import { Router } from 'express';

import { criarCadastrarEmpresaController } from '../factories/CadastrarEmpresaFactory';
import { criarCadastrarUsuarioProprietarioController } from '../factories/CadastrarUsuarioProprietarioFactory';

const empresaRoutes = Router();
const cadastrarEmpresaController = criarCadastrarEmpresaController();
const cadastrarUsuarioProprietarioController =
  criarCadastrarUsuarioProprietarioController();

empresaRoutes.post('/empresas', (request, response) =>
  cadastrarEmpresaController.handle(request, response),
);
empresaRoutes.post('/empresas/:empresaId/usuarios/dono', (request, response) =>
  cadastrarUsuarioProprietarioController.handle(request, response),
);

export { empresaRoutes };
