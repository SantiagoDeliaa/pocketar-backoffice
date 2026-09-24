'use server';

import { revalidatePath } from 'next/cache';
import { exigirStaff } from '@/lib/staff';
import { llamarRpcStaff } from '@/lib/rpc';
import { FORMATO_CODIGO_MOTIVO, LIMITE_TEXTO_MOTIVO, type ResultadoGuardarMotivo } from '@/lib/tipos/motivos';

/**
 * Crea o actualiza un motivo de rechazo (la RPC decide según exista el código). El código nunca cambia y no hay
 * borrado: desactivar (activo: false) es la forma de sacar un motivo. Las validaciones de acá sólo ahorran un viaje;
 * la fuente de verdad es la RPC. Mutación exclusivamente por staff.fn_*, con la sesión del staff.
 */
export async function guardarMotivoRechazo(
  codigo: string,
  textoUsuario: string,
  orden: number,
  activo: boolean,
  clave: string,
): Promise<ResultadoGuardarMotivo> {
  await exigirStaff();
  if (typeof codigo !== 'string' || !FORMATO_CODIGO_MOTIVO.test(codigo)) return { ok: false, codigo: 'INVALID_CODE' };
  const texto = typeof textoUsuario === 'string' ? textoUsuario.trim() : '';
  if (!texto) return { ok: false, codigo: 'TEXT_REQUIRED' };
  if ([...texto].length > LIMITE_TEXTO_MOTIVO) return { ok: false, codigo: 'TEXT_TOO_LONG' };
  if (!Number.isSafeInteger(orden)) return { ok: false, codigo: 'INVALID_ORDER' };
  if (typeof activo !== 'boolean') return { ok: false, codigo: 'INVALID_INPUT' };
  if (typeof clave !== 'string' || clave.length < 1 || clave.length > 128) return { ok: false, codigo: 'INVALID_IDEMPOTENCY_KEY' };

  const respuesta = await llamarRpcStaff('fn_staff_guardar_motivo_rechazo', {
    p_codigo: codigo,
    p_texto_usuario: texto,
    p_orden: orden,
    p_activo: activo,
    p_idempotency_key: clave,
  });
  if (!respuesta.ok) return { ok: false, codigo: respuesta.codigo };

  revalidatePath('/configuracion/motivos');
  return {
    ok: true,
    replayed: respuesta.datos.replayed === true,
    creado: respuesta.datos.creado === true,
    codigo: typeof respuesta.datos.codigo === 'string' ? respuesta.datos.codigo : codigo,
  };
}
