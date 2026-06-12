import { RealizarOnboardingController } from '../controllers/RealizarOnboardingController';
import { PrismaOnboardingRepository } from '../database/repositories/PrismaOnboardingRepository';
import { BcryptGeradorHash } from '../security/BcryptGeradorHash';
import { RealizarOnboardingService } from '../services/RealizarOnboardingService';

export function criarRealizarOnboardingController(): RealizarOnboardingController {
  return new RealizarOnboardingController(
    new RealizarOnboardingService(
      new PrismaOnboardingRepository(),
      new BcryptGeradorHash(),
    ),
  );
}
