import { AdminOperacionalController } from '../controllers/AdminOperacionalController';
import { PrismaAdminOperacionalRepository } from '../database/repositories/PrismaAdminOperacionalRepository';
import { AtualizarConfiguracaoFiscalEmpresaAdminOperacionalService } from '../services/admin-operacional/AtualizarConfiguracaoFiscalEmpresaAdminOperacionalService';
import { AtualizarEmissaoEmpresaAdminOperacionalService } from '../services/admin-operacional/AtualizarEmissaoEmpresaAdminOperacionalService';
import { ListarEventosFiscaisAdminOperacionalService } from '../services/admin-operacional/ListarEventosFiscaisAdminOperacionalService';
import { ListarEmpresasAdminOperacionalService } from '../services/admin-operacional/ListarEmpresasAdminOperacionalService';
import { ListarNotasAdminOperacionalService } from '../services/admin-operacional/ListarNotasAdminOperacionalService';

export function criarAdminOperacionalController(): AdminOperacionalController {
  const adminOperacionalRepository = new PrismaAdminOperacionalRepository();

  return new AdminOperacionalController(
    new ListarEmpresasAdminOperacionalService(adminOperacionalRepository),
    new AtualizarEmissaoEmpresaAdminOperacionalService(
      adminOperacionalRepository,
    ),
    new AtualizarConfiguracaoFiscalEmpresaAdminOperacionalService(
      adminOperacionalRepository,
    ),
    new ListarNotasAdminOperacionalService(adminOperacionalRepository),
    new ListarEventosFiscaisAdminOperacionalService(
      adminOperacionalRepository,
    ),
  );
}
