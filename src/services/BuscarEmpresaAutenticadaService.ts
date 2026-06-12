import { Empresa } from '../entities/Empresa';
import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export class BuscarEmpresaAutenticadaService {
  constructor(private readonly empresaRepository: EmpresaRepository) {}

  async executar(autenticacao: TokenPayload): Promise<Empresa> {
    const empresa = await this.empresaRepository.buscarPorId(
      autenticacao.empresaId,
    );

    if (!empresa) {
      throw new AutenticacaoInvalidaError();
    }

    return empresa;
  }
}
