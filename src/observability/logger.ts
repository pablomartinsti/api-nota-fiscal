import { sanitizarLog } from './sanitizar-log';

type NivelLog = 'info' | 'warn' | 'error';

interface LogInput {
  evento: string;
  contexto?: Record<string, unknown>;
}

export interface Logger {
  info(input: LogInput): void;
  warn(input: LogInput): void;
  error(input: LogInput): void;
}

class ConsoleLogger implements Logger {
  info(input: LogInput): void {
    this.escrever('info', input);
  }

  warn(input: LogInput): void {
    this.escrever('warn', input);
  }

  error(input: LogInput): void {
    this.escrever('error', input);
  }

  private escrever(nivel: NivelLog, input: LogInput): void {
    const payload = {
      nivel,
      evento: input.evento,
      timestamp: new Date().toISOString(),
      contexto: sanitizarLog(input.contexto ?? {}),
    };
    const texto = JSON.stringify(payload);

    if (nivel === 'error') {
      console.error(texto);
      return;
    }

    if (nivel === 'warn') {
      console.warn(texto);
      return;
    }

    console.log(texto);
  }
}

export const logger: Logger = new ConsoleLogger();
