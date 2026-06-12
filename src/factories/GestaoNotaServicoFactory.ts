import { GestaoNotaServicoController } from '../controllers/GestaoNotaServicoController';
import { PrismaClienteRepository } from '../database/repositories/PrismaClienteRepository';
import { PrismaNotaServicoRepository } from '../database/repositories/PrismaNotaServicoRepository';
import { PrismaServicoRepository } from '../database/repositories/PrismaServicoRepository';
import { AtualizarRascunhoNotaServicoService } from '../services/AtualizarRascunhoNotaServicoService';
import { BuscarNotaServicoService } from '../services/BuscarNotaServicoService';
import { CadastrarRascunhoNotaServicoService } from '../services/CadastrarRascunhoNotaServicoService';
import { ListarNotasServicoService } from '../services/ListarNotasServicoService';
import { ValidarReferenciasNotaServicoService } from '../services/ValidarReferenciasNotaServicoService';

export function criarGestaoNotaServicoController(): GestaoNotaServicoController {
  const notaRepository = new PrismaNotaServicoRepository();
  const validarReferencias = new ValidarReferenciasNotaServicoService(
    new PrismaClienteRepository(),
    new PrismaServicoRepository(),
  );

  return new GestaoNotaServicoController(
    new CadastrarRascunhoNotaServicoService(
      notaRepository,
      validarReferencias,
    ),
    new ListarNotasServicoService(notaRepository),
    new BuscarNotaServicoService(notaRepository),
    new AtualizarRascunhoNotaServicoService(
      notaRepository,
      validarReferencias,
    ),
  );
}
