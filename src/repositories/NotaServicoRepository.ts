import { NotaServico } from '../entities/NotaServico';
import { AmbienteFiscal } from '../entities/NotaServico';

export interface NotaServicoRepository {
  salvar(nota: NotaServico): Promise<NotaServico>;
  buscarPorIdEEmpresaId(
    id: string,
    empresaId: string,
  ): Promise<NotaServico | null>;
  listarPorEmpresaId(empresaId: string): Promise<NotaServico[]>;
  buscarMaiorNumeroDpsPorEmpresaAmbienteESerie(
    empresaId: string,
    ambienteFiscal: AmbienteFiscal,
    serieDps: string,
  ): Promise<number | null>;
}
