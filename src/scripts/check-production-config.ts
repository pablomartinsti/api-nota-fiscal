import { carregarEnv } from '../config/env';

try {
  carregarEnv({
    ...process.env,
    NODE_ENV: 'production',
  });

  console.log('Configuracao de producao valida.');
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : 'Configuracao de producao invalida.',
  );
  process.exitCode = 1;
}
