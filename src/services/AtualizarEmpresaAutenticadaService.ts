import {
  AlterarDadosCadastraisProps,
  Empresa,
  RegimeTributario,
} from '../entities/Empresa';
import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export interface AtualizarEmpresaAutenticadaInput
  extends AlterarDadosCadastraisProps {
  regimeTributario: RegimeTributario;
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

    return this.empresaRepository.salvar(empresa);
  }
}
