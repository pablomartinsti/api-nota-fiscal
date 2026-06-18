import { describe, expect, it } from 'vitest';

import { AmbienteFiscal } from '../entities/NotaServico';
import { ProducaoRealBloqueadaError } from '../errors/ProducaoRealBloqueadaError';
import { ValidarPermissaoProducaoRealService } from './ValidarPermissaoProducaoRealService';

describe('ValidarPermissaoProducaoRealService', () => {
  it('deve permitir homologacao mesmo com producao real bloqueada', () => {
    const service = new ValidarPermissaoProducaoRealService(false);

    expect(() => service.executar(AmbienteFiscal.HOMOLOGACAO)).not.toThrow();
  });

  it('deve bloquear producao real quando nao estiver explicitamente habilitada', () => {
    const service = new ValidarPermissaoProducaoRealService(false);

    expect(() => service.executar(AmbienteFiscal.PRODUCAO)).toThrow(
      ProducaoRealBloqueadaError,
    );
  });

  it('deve permitir producao real quando estiver explicitamente habilitada', () => {
    const service = new ValidarPermissaoProducaoRealService(true);

    expect(() => service.executar(AmbienteFiscal.PRODUCAO)).not.toThrow();
  });
});
