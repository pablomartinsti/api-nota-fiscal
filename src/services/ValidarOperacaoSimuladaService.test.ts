import { describe, expect, it } from 'vitest';

import { OperacaoSimuladaBloqueadaError } from '../errors/OperacaoSimuladaBloqueadaError';
import { ValidarOperacaoSimuladaService } from './ValidarOperacaoSimuladaService';

describe('ValidarOperacaoSimuladaService', () => {
  it('deve permitir operacao simulada fora de producao', () => {
    const service = new ValidarOperacaoSimuladaService('development');

    expect(() => service.executar()).not.toThrow();
  });

  it('deve bloquear operacao simulada em producao', () => {
    const service = new ValidarOperacaoSimuladaService('production');

    expect(() => service.executar()).toThrow(OperacaoSimuladaBloqueadaError);
  });
});
