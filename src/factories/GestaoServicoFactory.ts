import { GestaoServicoController } from '../controllers/GestaoServicoController';
import { PrismaServicoRepository } from '../database/repositories/PrismaServicoRepository';
import { AlterarStatusServicoService } from '../services/AlterarStatusServicoService';
import { AtualizarServicoService } from '../services/AtualizarServicoService';
import { BuscarServicoService } from '../services/BuscarServicoService';
import { CadastrarServicoService } from '../services/CadastrarServicoService';
import { ListarServicosService } from '../services/ListarServicosService';

export function criarGestaoServicoController(): GestaoServicoController {
  const repository = new PrismaServicoRepository();

  return new GestaoServicoController(
    new CadastrarServicoService(repository),
    new ListarServicosService(repository),
    new BuscarServicoService(repository),
    new AtualizarServicoService(repository),
    new AlterarStatusServicoService(repository),
  );
}
