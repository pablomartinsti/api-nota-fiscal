import { Empresa } from '../entities/Empresa';
import { Usuario } from '../entities/Usuario';

export interface ResultadoOnboarding {
  empresa: Empresa;
  proprietario: Usuario;
}

export interface OnboardingRepository {
  salvar(
    empresa: Empresa,
    proprietario: Usuario,
  ): Promise<ResultadoOnboarding>;
}
