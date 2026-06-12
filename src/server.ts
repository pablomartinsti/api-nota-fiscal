import { app } from './app';
import { env } from './config/env';
import { prisma } from './database/prisma.client';

const server = app.listen(env.PORT, () => {
  console.log(`API running on port ${env.PORT}`);
});

let encerrando = false;

async function encerrarAplicacao(signal: NodeJS.Signals): Promise<void> {
  if (encerrando) {
    return;
  }

  encerrando = true;
  console.log(`Recebido ${signal}. Encerrando aplicacao...`);

  server.close(async (error) => {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error('Erro ao desconectar do banco de dados.', disconnectError);
      process.exitCode = 1;
    }

    if (error) {
      console.error('Erro ao encerrar servidor HTTP.', error);
      process.exitCode = 1;
    }
  });
}

process.once('SIGINT', () => void encerrarAplicacao('SIGINT'));
process.once('SIGTERM', () => void encerrarAplicacao('SIGTERM'));
