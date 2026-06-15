import {
  AlterarDadosCadastraisProps,
  Empresa,
  RegimeApuracaoSimplesNacional,
  RegimeEspecialTributacao,
  RegimeTributario,
} from '../entities/Empresa';
import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export interface AtualizarEmpresaAutenticadaInput
  extends AlterarDadosCadastraisProps {
  regimeTributario: RegimeTributario;
  regimeEspecialTributacao: RegimeEspecialTributacao;
  regimeApuracaoSimplesNacional?: RegimeApuracaoSimplesNacional;
}

export class AtualizarEmpresaAutenticadaService {
  constructor(private readonly empresaRepository: EmpresaRepository) {}

  async executar(
    autenticacao: TokenPayload,
    dados: AtualizarEmpresaAutenticadaInput,
  ): Promise<Empresa> {
    const empresa = await this.empresaRepository.buscarPorId(
      autenticacao.empresaId,
    );

    if (!empresa) {
      throw new AutenticacaoInvalidaError();
    }

    empresa.alterarDadosCadastrais(dados);
    empresa.alterarRegimeTributario(dados.regimeTributario);
    empresa.alterarConfiguracaoFiscal(
      dados.regimeEspecialTributacao,
      dados.regimeApuracaoSimplesNacional,
    );

    return this.empresaRepository.salvar(empresa);
  }
}
