import { Router } from 'express';

import { criarRealizarOnboardingController } from '../factories/RealizarOnboardingFactory';

const onboardingRoutes = Router();
const controller = criarRealizarOnboardingController();

onboardingRoutes.post('/onboarding', (request, response) =>
  controller.handle(request, response),
);

export { onboardingRoutes };
