import { randomUUID } from 'node:crypto';

import { Empresa, RegimeTributario } from '../entities/Empresa';
import { PerfilUsuario, Usuario } from '../entities/Usuario';
import {
  OnboardingRepository,
  ResultadoOnboarding,
} from '../repositories/OnboardingRepository';
import { GeradorHash } from '../security/GeradorHash';

export interface RealizarOnboardingInput {
  empresa: {
    razaoSocial: string;
    nomeFantasia?: string;
    cnpj: string;
    inscricaoMunicipal?: string;
    regimeTributario: RegimeTributario;
    email?: string;
    telefone?: string;
    cep?: string;
    endereco?: string;
    numero?: string;
    bairro?: string;
    cidade: string;
    uf: string;
  };
  proprietario: {
    nome: string;
    email: string;
    senha: string;
  };
}

export class RealizarOnboardingService {
  constructor(
    private readonly onboardingRepository: OnboardingRepository,
    private readonly geradorHash: GeradorHash,
  ) {}

  async executar(input: RealizarOnboardingInput): Promise<ResultadoOnboarding> {
    if (!input.proprietario.senha.trim()) {
      throw new Error('Senha e obrigatoria.');
    }

    const empresa = new Empresa({
      id: randomUUID(),
      ...input.empresa,
    });
    const senhaHash = await this.geradorHash.gerar(input.proprietario.senha);
    const proprietario = new Usuario({
      id: randomUUID(),
      empresaId: empresa.id!,
      nome: input.proprietario.nome,
      email: input.proprietario.email,
      senhaHash,
      perfil: PerfilUsuario.DONO,
    });

    return this.onboardingRepository.salvar(empresa, proprietario);
  }
}
