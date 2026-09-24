/** Un motivo de rechazo de publicaciones (staff.motivos_rechazo). El código es la identidad: nunca cambia ni se borra. */
export type MotivoRechazoConfig = {
  codigo: string;
  texto_usuario: string;
  orden: number;
  activo: boolean;
  updated_at: string | null;
  /** Cuántas publicaciones se rechazaron con este código. */
  usos: number;
};

export const LIMITE_TEXTO_MOTIVO = 400;
export const FORMATO_CODIGO_MOTIVO = /^[a-z0-9_]{3,40}$/;

export type ResultadoGuardarMotivo =
  | { ok: true; replayed: boolean; creado: boolean; codigo: string }
  | { ok: false; codigo: string };
