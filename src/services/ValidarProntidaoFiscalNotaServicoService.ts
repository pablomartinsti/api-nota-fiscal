import { AmbienteFiscal } from '../entities/NotaServico';
import { RegimeTributario } from '../entities/Empresa';
import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { ClienteNaoEncontradoError } from '../errors/ClienteNaoEncontradoError';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { ServicoNaoEncontradoError } from '../errors/ServicoNaoEncontradoError';
import { listarPendenciasFiscaisDps } from '../fiscal/ProntidaoFiscalDps';
import { ClienteRepository } from '../repositories/ClienteRepository';
import { ConfiguracaoFiscalEmpresaRepository } from '../repositories/ConfiguracaoFiscalEmpresaRepository';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { ServicoRepository } from '../repositories/ServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export interface ChecklistProducaoReal {
  habilitada: boolean;
  emissaoHabilitada: boolean;
  regimeTributarioSuportado: boolean;
  urlSefinProducaoConfigurada: boolean;
  xsdDpsConfigurado: boolean;
  xsdEventoConfigurado: boolean;
  certificadoA1EmpresaConfigurado: boolean;
}

export interface ResultadoProntidaoFiscal {
  pronto: boolean;
  pendencias: string[];
  producaoReal?: ChecklistProducaoReal;
}

export interface ValidarProntidaoFiscalNotaServicoOptions {
  configuracaoFiscalRepository?: ConfiguracaoFiscalEmpresaRepository;
  permitirProducaoReal?: boolean;
  baseUrlProducao?: string;
  xsdDpsPath?: string;
  xsdEventoPath?: string;
}

export class ValidarProntidaoFiscalNotaServicoService {
  constructor(
    private readonly empresaRepository: EmpresaRepository,
    private readonly clienteRepository: ClienteRepository,
    private readonly servicoRepository: ServicoRepository,
    private readonly notaRepository: NotaServicoRepository,
    private readonly options: ValidarProntidaoFiscalNotaServicoOptions = {},
  ) {}

  async executar(
    autenticacao: TokenPayload,
    notaId: string,
  ): Promise<ResultadoProntidaoFiscal> {
    const nota = await this.notaRepository.buscarPorIdEEmpresaId(
      notaId,
      autenticacao.empresaId,
    );

    if (!nota) {
      throw new NotaServicoNaoEncontradaError();
    }

    const [empresa, cliente, servico] = await Promise.all([
      this.empresaRepository.buscarPorId(autenticacao.empresaId),
      this.clienteRepository.buscarPorIdEEmpresaId(
        nota.clienteId,
        autenticacao.empresaId,
      ),
      this.servicoRepository.buscarPorIdEEmpresaId(
        nota.servicoId,
        autenticacao.empresaId,
      ),
    ]);

    if (!empresa) {
      throw new AutenticacaoInvalidaError();
    }

    if (!cliente) {
      throw new ClienteNaoEncontradoError();
    }

    if (!servico) {
      throw new ServicoNaoEncontradoError();
    }

    const pendencias = listarPendenciasFiscaisDps({
      empresa,
      servico,
      nota,
    });
    const configuracaoFiscal =
      await this.options.configuracaoFiscalRepository?.buscarPorEmpresaId(
        autenticacao.empresaId,
      );

    if (configuracaoFiscal?.emissaoHabilitada === false) {
      pendencias.push('empresa.configuracaoFiscal.emissaoBloqueada');
    }

    const producaoReal =
      nota.ambienteFiscal === AmbienteFiscal.PRODUCAO
        ? await this.validarChecklistProducaoReal(
            empresa.regimeTributario,
            pendencias,
            configuracaoFiscal,
          )
        : undefined;

    return {
      pronto: pendencias.length === 0,
      pendencias,
      ...(producaoReal ? { producaoReal } : {}),
    };
  }

  private async validarChecklistProducaoReal(
    regimeTributario: RegimeTributario,
    pendencias: string[],
    configuracaoFiscal?: Awaited<
      ReturnType<ConfiguracaoFiscalEmpresaRepository['buscarPorEmpresaId']>
    >,
  ): Promise<ChecklistProducaoReal> {
    const checklist: ChecklistProducaoReal = {
      habilitada: this.options.permitirProducaoReal === true,
      emissaoHabilitada: configuracaoFiscal?.emissaoHabilitada !== false,
      regimeTributarioSuportado:
        regimeTributario === RegimeTributario.SIMPLES_NACIONAL,
      urlSefinProducaoConfigurada: this.urlProducaoValida(),
      xsdDpsConfigurado: this.textoConfigurado(this.options.xsdDpsPath),
      xsdEventoConfigurado: this.textoConfigurado(
        this.options.xsdEventoPath,
      ),
      certificadoA1EmpresaConfigurado: Boolean(
        configuracaoFiscal?.ativo &&
          configuracaoFiscal.possuiCertificadoA1(),
      ),
    };

    if (!checklist.habilitada) {
      pendencias.push('producaoReal.permissao');
    }

    if (!checklist.emissaoHabilitada) {
      pendencias.push('producaoReal.emissaoBloqueada');
    }

    if (!checklist.regimeTributarioSuportado) {
      pendencias.push('empresa.regimeTributario');
    }

    if (!checklist.urlSefinProducaoConfigurada) {
      pendencias.push('producaoReal.urlSefinProducao');
    }

    if (!checklist.xsdDpsConfigurado) {
      pendencias.push('producaoReal.xsdDpsPath');
    }

    if (!checklist.xsdEventoConfigurado) {
      pendencias.push('producaoReal.xsdEventoPath');
    }

    if (!checklist.certificadoA1EmpresaConfigurado) {
      pendencias.push('empresa.configuracaoFiscal.certificadoA1');
    }

    return checklist;
  }

  private urlProducaoValida(): boolean {
    const url = this.options.baseUrlProducao?.trim().toLowerCase();

    return Boolean(url && !url.includes('producaorestrita'));
  }

  private textoConfigurado(valor?: string): boolean {
    return Boolean(valor?.trim());
  }
}
