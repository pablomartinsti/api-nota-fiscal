import { Router } from 'express';

import { autenticacaoRoutes } from './autenticacao.routes';
import { clienteRoutes } from './cliente.routes';
import { empresaRoutes } from './empresa.routes';
import { notaServicoRoutes } from './nota-servico.routes';
import { onboardingRoutes } from './onboarding.routes';
import { operacionalRoutes } from './operacional.routes';
import { servicoRoutes } from './servico.routes';
import { usuarioRoutes } from './usuario.routes';

const routes = Router();

routes.get('/', (request, response) => {
  return response.json({
    message: 'NFS-e API running',
  });
});

routes.use(operacionalRoutes);
routes.use(onboardingRoutes);
routes.use(autenticacaoRoutes);
routes.use(empresaRoutes);
routes.use(usuarioRoutes);
routes.use(clienteRoutes);
routes.use(servicoRoutes);
routes.use(notaServicoRoutes);

export { routes };
