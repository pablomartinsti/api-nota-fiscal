import { AmbienteFiscal } from '../entities/NotaServico';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';

export class GerarProximoNumeroDpsService {
  constructor(private readonly notaRepository: NotaServicoRepository) {}

  async executar(
    empresaId: string,
    ambienteFiscal: AmbienteFiscal,
    serieDps: string,
    numeroDpsInformado?: string,
  ): Promise<string> {
    if (numeroDpsInformado) {
      return numeroDpsInformado;
    }

    const maiorNumero =
      await this.notaRepository.buscarMaiorNumeroDpsPorEmpresaAmbienteESerie(
        empresaId,
        ambienteFiscal,
        serieDps,
      );

    return String((maiorNumero ?? 0) + 1);
  }
}
