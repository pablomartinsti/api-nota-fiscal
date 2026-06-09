export interface GeradorHash {
  gerar(valor: string): Promise<string>;
}
