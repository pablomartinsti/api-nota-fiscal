import { GestaoServicoController } from '../controllers/GestaoServicoController';
import { PrismaServicoRepository } from '../database/repositories/PrismaServicoRepository';
import { AlterarStatusServicoService } from '../services/servicos/AlterarStatusServicoService';
import { AtualizarServicoService } from '../services/servicos/AtualizarServicoService';
import { BuscarServicoService } from '../services/servicos/BuscarServicoService';
import { CadastrarServicoService } from '../services/servicos/CadastrarServicoService';
import { ListarServicosService } from '../services/servicos/ListarServicosService';

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
