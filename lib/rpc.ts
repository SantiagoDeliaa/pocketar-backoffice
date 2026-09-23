import 'server-only';

import { headers } from 'next/headers';
import { crearClienteServidor } from '@/lib/supabase/server';

export async function contextoAuditoria() {
  const cabeceras = await headers();
  return {
    ip: cabeceras.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: cabeceras.get('user-agent') ?? null,
  };
}

export type RespuestaRpc = Record<string, unknown> & { error?: string };

/**
 * Llama a un wrapper public.fn_staff_* con la SESIÓN del staff, nunca con service_role:
 * la RPC toma el actor de auth.uid() y sin sesión el log queda sin actor y responde 403.
 *
 * Un no-staff vuelve como error HTTP 403 (42501); un error de negocio vuelve HTTP 200 con
 * {"error": "CÓDIGO"}. Los dos se normalizan a { ok: false, codigo }.
 * El llamador ya tiene que haber pasado por exigirStaff().
 */
export async function llamarRpcStaff(
  nombre: string,
  parametros: Record<string, unknown>,
  { conContexto = true }: { conContexto?: boolean } = {},
): Promise<{ ok: true; datos: RespuestaRpc } | { ok: false; codigo: string; datos?: RespuestaRpc }> {
  const supabase = await crearClienteServidor();
  const contexto = conContexto ? await contextoAuditoria() : null;
  const { data, error } = await supabase.rpc(nombre, {
    ...parametros,
    ...(contexto ? { p_ip: contexto.ip, p_user_agent: contexto.userAgent } : {}),
  });

  if (error) {
    if (error.code === '42501') return { ok: false, codigo: 'FORBIDDEN' };
    if (error.code === '40P01') return { ok: false, codigo: 'DEADLOCK' };
    console.error(`Falló la llamada a ${nombre}.`, error.code);
    return { ok: false, codigo: 'OPERACION_NO_DISPONIBLE' };
  }

  const respuesta = (data ?? {}) as RespuestaRpc;
  if (typeof respuesta.error === 'string') {
    return { ok: false, codigo: respuesta.error, datos: respuesta };
  }
  return { ok: true, datos: respuesta };
}
