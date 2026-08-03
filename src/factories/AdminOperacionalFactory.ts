import { AdminOperacionalController } from '../controllers/AdminOperacionalController';
import { PrismaAdminOperacionalRepository } from '../database/repositories/PrismaAdminOperacionalRepository';
import { AtualizarEmissaoEmpresaAdminOperacionalService } from '../services/AtualizarEmissaoEmpresaAdminOperacionalService';
import { ListarEventosFiscaisAdminOperacionalService } from '../services/ListarEventosFiscaisAdminOperacionalService';
import { ListarEmpresasAdminOperacionalService } from '../services/ListarEmpresasAdminOperacionalService';
import { ListarNotasAdminOperacionalService } from '../services/ListarNotasAdminOperacionalService';

export function criarAdminOperacionalController(): AdminOperacionalController {
  const adminOperacionalRepository = new PrismaAdminOperacionalRepository();

  return new AdminOperacionalController(
    new ListarEmpresasAdminOperacionalService(adminOperacionalRepository),
    new AtualizarEmissaoEmpresaAdminOperacionalService(
      adminOperacionalRepository,
    ),
    new ListarNotasAdminOperacionalService(adminOperacionalRepository),
    new ListarEventosFiscaisAdminOperacionalService(
      adminOperacionalRepository,
    ),
  );
}
