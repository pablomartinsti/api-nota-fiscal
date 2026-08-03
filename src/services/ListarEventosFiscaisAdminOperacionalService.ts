import {
  AdminEventoFiscalResumo,
  AdminOperacionalRepository,
  FiltrosAdminEventosFiscais,
} from '../repositories/AdminOperacionalRepository';

export class ListarEventosFiscaisAdminOperacionalService {
  constructor(
    private readonly adminOperacionalRepository: AdminOperacionalRepository,
  ) {}

  async executar(
    filtros: FiltrosAdminEventosFiscais,
  ): Promise<AdminEventoFiscalResumo[]> {
    return this.adminOperacionalRepository.listarEventosFiscais(filtros);
  }
}
