import { Router } from 'express';

import { autenticacaoRoutes } from './autenticacao.routes';
import { empresaRoutes } from './empresa.routes';

const routes = Router();

routes.get('/', (request, response) => {
  return response.json({
    message: 'NFS-e API running',
  });
});

routes.use(empresaRoutes);
routes.use(autenticacaoRoutes);

export { routes };
