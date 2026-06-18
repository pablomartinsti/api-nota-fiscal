import { ConfiguracaoFiscalEmpresa } from '../entities/ConfiguracaoFiscalEmpresa';
import { ConfiguracaoFiscalEmpresaRepository } from '../repositories/ConfiguracaoFiscalEmpresaRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export interface BuscarConfiguracaoFiscalEmpresaResultado {
  configuracao: ConfiguracaoFiscalEmpresa;
  configurada: boolean;
}

export class BuscarConfiguracaoFiscalEmpresaAutenticadaService {
  constructor(
    private readonly configuracaoFiscalRepository: ConfiguracaoFiscalEmpresaRepository,
  ) {}

  async executar(
    autenticacao: TokenPayload,
  ): Promise<BuscarConfiguracaoFiscalEmpresaResultado> {
    const configuracao =
      await this.configuracaoFiscalRepository.buscarPorEmpresaId(
        autenticacao.empresaId,
      );

    if (configuracao) {
      return {
        configuracao,
        configurada: true,
      };
    }

    return {
      configuracao: new ConfiguracaoFiscalEmpresa({
        empresaId: autenticacao.empresaId,
        ativo: false,
      }),
      configurada: false,
    };
  }
}
