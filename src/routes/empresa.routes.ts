import { Router } from 'express';

import { criarCadastrarEmpresaController } from '../factories/CadastrarEmpresaFactory';

const empresaRoutes = Router();
const cadastrarEmpresaController = criarCadastrarEmpresaController();

empresaRoutes.post('/empresas', (request, response) =>
  cadastrarEmpresaController.handle(request, response),
);

export { empresaRoutes };
