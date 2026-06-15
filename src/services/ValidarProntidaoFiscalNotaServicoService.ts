import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { ClienteNaoEncontradoError } from '../errors/ClienteNaoEncontradoError';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { ServicoNaoEncontradoError } from '../errors/ServicoNaoEncontradoError';
import { ClienteRepository } from '../repositories/ClienteRepository';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { ServicoRepository } from '../repositories/ServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export interface ResultadoProntidaoFiscal {
  pronto: boolean;
  pendencias: string[];
}

export class ValidarProntidaoFiscalNotaServicoService {
  constructor(
    private readonly empresaRepository: EmpresaRepository,
    private readonly clienteRepository: ClienteRepository,
    private readonly servicoRepository: ServicoRepository,
    private readonly notaRepository: NotaServicoRepository,
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

    const pendencias: string[] = [];

    ValidarProntidaoFiscalNotaServicoService.adicionarPendencia(
      pendencias,
      empresa.codigoMunicipioIbge,
      'empresa.codigoMunicipioIbge',
    );
    ValidarProntidaoFiscalNotaServicoService.adicionarPendencia(
      pendencias,
      servico.codigoTributacaoNacional,
      'servico.codigoTributacaoNacional',
    );
    ValidarProntidaoFiscalNotaServicoService.adicionarPendencia(
      pendencias,
      nota.serieDps,
      'nota.serieDps',
    );
    ValidarProntidaoFiscalNotaServicoService.adicionarPendencia(
      pendencias,
      nota.numeroDps,
      'nota.numeroDps',
    );
    ValidarProntidaoFiscalNotaServicoService.adicionarPendencia(
      pendencias,
      nota.dataCompetencia,
      'nota.dataCompetencia',
    );
    ValidarProntidaoFiscalNotaServicoService.adicionarPendencia(
      pendencias,
      nota.codigoMunicipioPrestacao,
      'nota.codigoMunicipioPrestacao',
    );

    return {
      pronto: pendencias.length === 0,
      pendencias,
    };
  }

  private static adicionarPendencia(
    pendencias: string[],
    valor: unknown,
    campo: string,
  ): void {
    if (valor === undefined || valor === null || valor === '') {
      pendencias.push(campo);
    }
  }
}
