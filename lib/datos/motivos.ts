import 'server-only';

import { llamarRpcStaff } from '@/lib/rpc';
import type { MotivoRechazoConfig } from '@/lib/tipos/motivos';

export type ResultadoMotivos = { ok: true; motivos: MotivoRechazoConfig[] } | { ok: false; codigo: string };

/**
 * Lista todos los motivos de rechazo (activos primero, por orden) con la sesión del staff. Es una lectura: no lleva
 * p_ip ni p_user_agent. El llamador ya tiene que haber pasado por exigirStaff().
 */
export async function obtenerMotivosRechazo(): Promise<ResultadoMotivos> {
  const respuesta = await llamarRpcStaff('fn_staff_listar_motivos_rechazo', {}, { conContexto: false });
  if (!respuesta.ok) return { ok: false, codigo: respuesta.codigo };
  if (!Array.isArray(respuesta.datos.motivos)) return { ok: false, codigo: 'OPERACION_NO_DISPONIBLE' };

  const motivos = (respuesta.datos.motivos as Record<string, unknown>[]).map((fila) => ({
    codigo: String(fila.codigo),
    texto_usuario: String(fila.texto_usuario ?? ''),
    orden: Number(fila.orden ?? 0),
    activo: fila.activo === true,
    updated_at: typeof fila.updated_at === 'string' ? fila.updated_at : null,
    usos: Number(fila.usos ?? 0),
  }));
  return { ok: true, motivos };
}
