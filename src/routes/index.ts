import { Router } from 'express';

import { autenticacaoRoutes } from './autenticacao.routes';
import { clienteRoutes } from './cliente.routes';
import { empresaRoutes } from './empresa.routes';
import { usuarioRoutes } from './usuario.routes';

const routes = Router();

routes.get('/', (request, response) => {
  return response.json({
    message: 'NFS-e API running',
  });
});

routes.use(empresaRoutes);
routes.use(autenticacaoRoutes);
routes.use(usuarioRoutes);
routes.use(clienteRoutes);

export { routes };
