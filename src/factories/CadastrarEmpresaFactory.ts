import { CadastrarEmpresaController } from '../controllers/CadastrarEmpresaController';
import { PrismaEmpresaRepository } from '../database/repositories/PrismaEmpresaRepository';
import { CadastrarEmpresaService } from '../services/CadastrarEmpresaService';

export function criarCadastrarEmpresaController(): CadastrarEmpresaController {
  const empresaRepository = new PrismaEmpresaRepository();
  const cadastrarEmpresaService = new CadastrarEmpresaService(empresaRepository);

  return new CadastrarEmpresaController(cadastrarEmpresaService);
}
