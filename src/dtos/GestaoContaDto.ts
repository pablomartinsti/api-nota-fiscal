import { z } from 'zod';

export const atualizarContaSchema = z.object({
  nome: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
});

export const alterarSenhaContaSchema = z.object({
  senhaAtual: z.string().min(1),
  novaSenha: z
    .string()
    .min(8)
    .refine((senha) => senha.trim().length > 0),
});
