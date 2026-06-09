import { Router } from 'express';

import { empresaRoutes } from './empresa.routes';

const routes = Router();

routes.get('/', (request, response) => {
  return response.json({
    message: 'NFS-e API running',
  });
});

routes.use(empresaRoutes);

export { routes };
