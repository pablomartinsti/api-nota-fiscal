export interface ComparadorHash {
  comparar(valor: string, hash: string): Promise<boolean>;
}
