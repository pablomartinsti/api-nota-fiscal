import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { ClienteNaoEncontradoError } from '../errors/ClienteNaoEncontradoError';
import { NotaServicoComPendenciasFiscaisError } from '../errors/NotaServicoComPendenciasFiscaisError';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { ServicoNaoEncontradoError } from '../errors/ServicoNaoEncontradoError';
import { GeradorXmlDps } from '../fiscal/GeradorXmlDps';
import { listarPendenciasFiscaisDps } from '../fiscal/ProntidaoFiscalDps';
import { ClienteRepository } from '../repositories/ClienteRepository';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { ServicoRepository } from '../repositories/ServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export class GerarXmlDpsNotaServicoService {
  constructor(
    private readonly empresaRepository: EmpresaRepository,
    private readonly clienteRepository: ClienteRepository,
    private readonly servicoRepository: ServicoRepository,
    private readonly notaRepository: NotaServicoRepository,
    private readonly geradorXml: GeradorXmlDps,
  ) {}

  async executar(autenticacao: TokenPayload, notaId: string): Promise<string> {
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

    if (pendencias.length > 0) {
      throw new NotaServicoComPendenciasFiscaisError(pendencias);
    }

    return this.geradorXml.gerar({
      empresa,
      cliente,
      servico,
      nota,
    });
  }
}
