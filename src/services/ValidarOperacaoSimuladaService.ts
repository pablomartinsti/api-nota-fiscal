import { OperacaoSimuladaBloqueadaError } from '../errors/OperacaoSimuladaBloqueadaError';

export class ValidarOperacaoSimuladaService {
  constructor(private readonly nodeEnv: string) {}

  executar(): void {
    if (this.nodeEnv === 'production') {
      throw new OperacaoSimuladaBloqueadaError();
    }
  }
}
