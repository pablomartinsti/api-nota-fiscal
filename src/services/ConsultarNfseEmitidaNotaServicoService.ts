import { AmbienteFiscal, StatusNota } from '../entities/NotaServico';
import { CertificadoA1EmpresaProducaoAusenteError } from '../errors/CertificadoA1EmpresaProducaoAusenteError';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import {
  ClienteNfseNacional,
  ErroEnvioDpsNfse,
} from '../fiscal/ClienteNfseNacional';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';
import { ResolverConfiguracaoFiscalEmpresaService } from './ResolverConfiguracaoFiscalEmpresaService';
import { ValidarPermissaoProducaoRealService } from './ValidarPermissaoProducaoRealService';

export interface ConsultaNfseEmitidaResultado {
  notaId?: string;
  chaveAcesso: string;
  sucesso: boolean;
  statusHttp: number;
  tipoAmbiente?: number;
  versaoAplicativo?: string;
  dataHoraProcessamento?: string;
  xmlAutorizado?: string;
  erros?: ErroEnvioDpsNfse[];
}

export class ConsultarNfseEmitidaNotaServicoService {
  constructor(
    private readonly notaRepository: NotaServicoRepository,
    private readonly clienteNfse: ClienteNfseNacional,
    private readonly resolverConfiguracaoFiscal?: ResolverConfiguracaoFiscalEmpresaService,
    private readonly validarPermissaoProducaoReal?: ValidarPermissaoProducaoRealService,
  ) {}

  async executar(
    autenticacao: TokenPayload,
    notaId: string,
  ): Promise<ConsultaNfseEmitidaResultado> {
    const nota = await this.notaRepository.buscarPorIdEEmpresaId(
      notaId,
      autenticacao.empresaId,
    );

    if (!nota) {
      throw new NotaServicoNaoEncontradaError();
    }

    if (nota.status !== StatusNota.EMITIDA) {
      throw new TransicaoStatusNotaInvalidaError(
        'Somente uma nota emitida pode ser consultada na SEFIN Nacional.',
      );
    }

    if (!nota.chaveAcesso) {
      throw new TransicaoStatusNotaInvalidaError(
        'A nota emitida nao possui chave de acesso para consulta.',
      );
    }

    this.validarPermissaoProducaoReal?.executar(nota.ambienteFiscal);

    const resultado = await this.clienteNfse.consultarNfsePorChave(
      await this.criarInputConsultaNfse(
        autenticacao.empresaId,
        nota.ambienteFiscal,
        nota.chaveAcesso,
      ),
    );

    return {
      notaId: nota.id,
      chaveAcesso: resultado.chaveAcesso ?? nota.chaveAcesso,
      sucesso: resultado.sucesso,
      statusHttp: resultado.statusHttp,
      tipoAmbiente: resultado.tipoAmbiente,
      versaoAplicativo: resultado.versaoAplicativo,
      dataHoraProcessamento: resultado.dataHoraProcessamento,
      xmlAutorizado: resultado.xmlAutorizado,
      erros: resultado.erros,
    };
  }

  private async criarInputConsultaNfse(
    empresaId: string,
    ambienteFiscal: AmbienteFiscal,
    chaveAcesso: string,
  ) {
    const configuracaoCertificado = await this.obterConfiguracaoCertificado(
      empresaId,
      ambienteFiscal,
    );

    if (!configuracaoCertificado) {
      return { chaveAcesso };
    }

    return {
      chaveAcesso,
      certificadoPath: configuracaoCertificado.caminho,
      certificadoSenha: configuracaoCertificado.senha,
    };
  }

  private async obterConfiguracaoCertificado(
    empresaId: string,
    ambienteFiscal: AmbienteFiscal,
  ) {
    if (!this.resolverConfiguracaoFiscal) {
      if (ambienteFiscal === AmbienteFiscal.PRODUCAO) {
        throw new CertificadoA1EmpresaProducaoAusenteError();
      }

      return undefined;
    }

    return this.resolverConfiguracaoFiscal.obterCertificadoA1ParaAmbiente(
      empresaId,
      ambienteFiscal,
    );
  }
}
