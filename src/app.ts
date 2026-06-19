import cors from 'cors';
import express from 'express';

import { env } from './config/env';
import { errorHandler } from './middleware/error-handler.middleware';
import { requestLogger } from './middleware/request-logger.middleware';
import { routes } from './routes';

const app = express();
const origensPermitidas =
  env.CORS_ORIGIN === '*'
    ? '*'
    : env.CORS_ORIGIN.split(',').map((origem) => origem.trim());

app.use(cors({ origin: origensPermitidas }));
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);
app.use(routes);
app.use((_request, response) => {
  return response.status(404).json({
    message: 'Rota nao encontrada.',
  });
});
app.use(errorHandler);

export { app };
