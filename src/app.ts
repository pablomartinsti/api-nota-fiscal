import cors from 'cors';
import express from 'express';

import { errorHandler } from './middleware/error-handler.middleware';
import { routes } from './routes';

const app = express();

app.use(cors());
app.use(express.json());
app.use(routes);
app.use(errorHandler);

export { app };
