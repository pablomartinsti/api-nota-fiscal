export class RegimeTributarioProducaoNaoSuportadoError extends Error {
  constructor() {
    super(
      'Emissao em producao real esta liberada apenas para empresas do Simples Nacional nesta versao.',
    );
    this.name = 'RegimeTributarioProducaoNaoSuportadoError';
  }
}
