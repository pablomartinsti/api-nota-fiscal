import { GestaoEmpresaController } from '../controllers/GestaoEmpresaController';
import { PrismaEmpresaRepository } from '../database/repositories/PrismaEmpresaRepository';
import { AtualizarEmpresaAutenticadaService } from '../services/AtualizarEmpresaAutenticadaService';
import { BuscarEmpresaAutenticadaService } from '../services/BuscarEmpresaAutenticadaService';

export function criarGestaoEmpresaController(): GestaoEmpresaController {
  const repository = new PrismaEmpresaRepository();

  return new GestaoEmpresaController(
    new BuscarEmpresaAutenticadaService(repository),
    new AtualizarEmpresaAutenticadaService(repository),
  );
}
