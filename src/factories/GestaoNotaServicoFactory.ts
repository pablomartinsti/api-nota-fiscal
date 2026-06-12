import { GestaoNotaServicoController } from '../controllers/GestaoNotaServicoController';
import { PrismaClienteRepository } from '../database/repositories/PrismaClienteRepository';
import { PrismaNotaServicoRepository } from '../database/repositories/PrismaNotaServicoRepository';
import { PrismaServicoRepository } from '../database/repositories/PrismaServicoRepository';
import { EmissorNotaServicoSimulado } from '../fiscal/EmissorNotaServicoSimulado';
import { AtualizarRascunhoNotaServicoService } from '../services/AtualizarRascunhoNotaServicoService';
import { BuscarNotaServicoService } from '../services/BuscarNotaServicoService';
import { CancelarNotaServicoService } from '../services/CancelarNotaServicoService';
import { CadastrarRascunhoNotaServicoService } from '../services/CadastrarRascunhoNotaServicoService';
import { EmitirNotaServicoService } from '../services/EmitirNotaServicoService';
import { ListarNotasServicoService } from '../services/ListarNotasServicoService';
import { RetornarNotaServicoParaRascunhoService } from '../services/RetornarNotaServicoParaRascunhoService';
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
    new EmitirNotaServicoService(
      notaRepository,
      new EmissorNotaServicoSimulado(),
    ),
    new RetornarNotaServicoParaRascunhoService(notaRepository),
    new CancelarNotaServicoService(notaRepository),
  );
}
