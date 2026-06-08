import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { routes } from './routes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use(routes);

const port = process.env.PORT || 3333;

app.listen(port, () => {
  console.log(`API running on port ${port}`);
});
