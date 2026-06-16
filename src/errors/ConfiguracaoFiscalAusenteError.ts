export class ConfiguracaoFiscalAusenteError extends Error {
  constructor() {
    super('Configuracao fiscal para assinatura da DPS nao foi informada.');
    this.name = 'ConfiguracaoFiscalAusenteError';
  }
}
