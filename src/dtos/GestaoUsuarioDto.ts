import { z } from 'zod';

import { PerfilUsuario } from '../entities/Usuario';

export const cadastrarUsuarioEmpresaSchema = z.object({
  nome: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
  senha: z
    .string()
    .min(8)
    .refine((senha) => senha.trim().length > 0),
  perfil: z.enum(PerfilUsuario),
});

export const usuarioParamsSchema = z.object({
  usuarioId: z.string().trim().min(1),
});

export const alterarPerfilUsuarioSchema = z.object({
  perfil: z.enum(PerfilUsuario),
});

export const alterarStatusUsuarioSchema = z.object({
  ativo: z.boolean(),
});
