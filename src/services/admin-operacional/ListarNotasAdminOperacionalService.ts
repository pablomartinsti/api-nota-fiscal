import {
  AdminNotaResumo,
  AdminOperacionalRepository,
  FiltrosAdminNotas,
} from '../../repositories/AdminOperacionalRepository';

export class ListarNotasAdminOperacionalService {
  constructor(
    private readonly adminOperacionalRepository: AdminOperacionalRepository,
  ) {}

  async executar(filtros: FiltrosAdminNotas): Promise<AdminNotaResumo[]> {
    return this.adminOperacionalRepository.listarNotas(filtros);
  }
}
