import { ConfiguracaoFiscalEmpresa } from '../entities/ConfiguracaoFiscalEmpresa';

export interface ConfiguracaoFiscalEmpresaRepository {
  buscarPorEmpresaId(
    empresaId: string,
  ): Promise<ConfiguracaoFiscalEmpresa | null>;
}
