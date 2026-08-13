export interface ValidadorXmlDps {
  validar(xml: string): Promise<void>;
}
