export interface CifradorTexto {
  criptografar(texto: string): string;
  descriptografar(textoCriptografado: string): string;
  estaCriptografado(texto: string): boolean;
}
