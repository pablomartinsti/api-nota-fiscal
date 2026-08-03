import {
  AdminEmpresaOperacionalResumo,
  AdminOperacionalRepository,
} from '../repositories/AdminOperacionalRepository';

export class ListarEmpresasAdminOperacionalService {
  constructor(
    private readonly adminOperacionalRepository: AdminOperacionalRepository,
  ) {}

  async executar(): Promise<AdminEmpresaOperacionalResumo[]> {
    return this.adminOperacionalRepository.listarEmpresas();
  }
}
