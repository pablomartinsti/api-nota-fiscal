import { z } from 'zod';

export const autenticarUsuarioSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  senha: z.string().trim().min(1),
});

export const autenticarUsuarioGoogleSchema = z.object({
  credential: z.string().trim().min(1),
});

export type AutenticarUsuarioDto = z.infer<typeof autenticarUsuarioSchema>;
export type AutenticarUsuarioGoogleDto = z.infer<
  typeof autenticarUsuarioGoogleSchema
>;
