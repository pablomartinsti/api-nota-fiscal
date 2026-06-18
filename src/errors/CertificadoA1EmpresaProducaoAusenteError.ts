export class CertificadoA1EmpresaProducaoAusenteError extends Error {
  constructor() {
    super(
      'Producao real exige certificado A1 configurado na propria empresa. Atualize a configuracao fiscal da empresa antes de continuar.',
    );
    this.name = 'CertificadoA1EmpresaProducaoAusenteError';
  }
}
