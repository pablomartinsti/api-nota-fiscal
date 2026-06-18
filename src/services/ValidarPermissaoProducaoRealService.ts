import { AmbienteFiscal } from '../entities/NotaServico';
import { ProducaoRealBloqueadaError } from '../errors/ProducaoRealBloqueadaError';

export class ValidarPermissaoProducaoRealService {
  constructor(private readonly permitirProducaoReal: boolean) {}

  executar(ambienteFiscal: AmbienteFiscal): void {
    if (
      ambienteFiscal === AmbienteFiscal.PRODUCAO &&
      !this.permitirProducaoReal
    ) {
      throw new ProducaoRealBloqueadaError();
    }
  }
}
