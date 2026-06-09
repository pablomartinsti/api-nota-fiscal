import { z } from 'zod';

export const cadastrarUsuarioProprietarioParamsSchema = z.object({
  empresaId: z.string().trim().min(1),
});

export const cadastrarUsuarioProprietarioSchema = z.object({
  nome: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
  senha: z
    .string()
    .min(8)
    .refine((senha) => senha.trim().length > 0),
});

export type CadastrarUsuarioProprietarioDto = z.infer<
  typeof cadastrarUsuarioProprietarioSchema
>;
