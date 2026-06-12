import { GestaoClienteController } from '../controllers/GestaoClienteController';
import { PrismaClienteRepository } from '../database/repositories/PrismaClienteRepository';
import { AlterarStatusClienteService } from '../services/AlterarStatusClienteService';
import { AtualizarClienteService } from '../services/AtualizarClienteService';
import { BuscarClienteService } from '../services/BuscarClienteService';
import { CadastrarClienteService } from '../services/CadastrarClienteService';
import { ListarClientesService } from '../services/ListarClientesService';

export function criarGestaoClienteController(): GestaoClienteController {
  const repository = new PrismaClienteRepository();

  return new GestaoClienteController(
    new CadastrarClienteService(repository),
    new ListarClientesService(repository),
    new BuscarClienteService(repository),
    new AtualizarClienteService(repository),
    new AlterarStatusClienteService(repository),
  );
}
