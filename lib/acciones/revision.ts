'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { exigirStaff } from '@/lib/staff';
import { crearClienteServidor } from '@/lib/supabase/server';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { obtenerComplementoRevision } from '@/lib/datos/revision';
import type { CatalogoRevision } from '@/lib/tipos/revision';

export type ResultadoAccion = { ok: true } | { ok: false; codigo: string };
type DatosRespuesta = { error?: string; notificar?: unknown };

async function contextoAuditoria() {
  const cabeceras = await headers();
  return {
    ip: cabeceras.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: cabeceras.get('user-agent') ?? null,
  };
}

async function enviarAvisos(notificar: unknown) {
  if (!Array.isArray(notificar) || notificar.length === 0) return;

  const admin = crearClienteAdmin();

  for (const aviso of notificar) {
    const { error } = await admin.functions.invoke('send_notification', {
      body: { ...(aviso as Record<string, unknown>), ya_persistida: true },
    });
    if (error) console.error('No pudimos enviar el aviso posterior a la operación.', error.message);
  }
}

async function ejecutar(nombre: string, parametros: Record<string, unknown>): Promise<ResultadoAccion> {
  await exigirStaff();
  const supabase = await crearClienteServidor();
  const contexto = await contextoAuditoria();
  const { data, error } = await supabase.rpc(nombre, {
    ...parametros,
    p_ip: contexto.ip,
    p_user_agent: contexto.userAgent,
  });

  const respuesta = (data ?? {}) as DatosRespuesta;
  if (error) return { ok: false, codigo: extraerCodigo(error.message) };
  if (respuesta.error) return { ok: false, codigo: respuesta.error };

  await enviarAvisos(respuesta.notificar);
  revalidatePath('/');
  revalidatePath('/revision');
  revalidatePath('/publicaciones');
  return { ok: true };
}

function extraerCodigo(mensaje: string) {
  const coincidente = mensaje.match(/(STALE_REVISION|FORBIDDEN|ASSIGNED_TO_OTHER|AUCTION_NOT_IN_REVIEW|AUCTION_NOT_OPEN|SELF_REVIEW|MESSAGE_REQUIRED|MESSAGE_TOO_LONG|COOLDOWN_NOT_APPLICABLE|INVALID_[A-Z_]+|AUCTION_NOT_FOUND)/);
  return coincidente?.[1] ?? 'OPERACION_NO_DISPONIBLE';
}

export async function abrirPublicacionRevision(id: string) {
  await exigirStaff();
  const supabase = await crearClienteServidor();
  const contexto = await contextoAuditoria();
  const { data, error } = await supabase.rpc('fn_staff_abrir_publicacion_revision', {
    p_auction_id: id,
    p_ip: contexto.ip,
    p_user_agent: contexto.userAgent,
  });
  const respuesta = (data ?? {}) as DatosRespuesta & Record<string, unknown>;
  if (error) return { ok: false as const, codigo: extraerCodigo(error.message) };
  if (respuesta.error) return { ok: false as const, codigo: respuesta.error };
  return { ok: true as const, datos: respuesta };
}

export async function cargarComplementoRevision(id: string) {
  await exigirStaff();
  return obtenerComplementoRevision(id);
}

export async function obtenerCatalogoRevision(): Promise<
  { ok: true; catalogo: CatalogoRevision } | { ok: false; codigo: string }
> {
  await exigirStaff();
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('fn_staff_catalogo_revision');
  if (error) return { ok: false, codigo: extraerCodigo(error.message) };

  const catalogo = data as Partial<CatalogoRevision> | null;
  if (!catalogo || !Array.isArray(catalogo.motivos) || !Array.isArray(catalogo.miembros)) {
    return { ok: false, codigo: 'CATALOGO_NO_DISPONIBLE' };
  }
  return {
    ok: true,
    catalogo: {
      motivos: catalogo.motivos,
      miembros: catalogo.miembros,
    },
  };
}

export async function aprobarPublicacion(id: string, intentosRevision: number, idempotencyKey: string) {
  return ejecutar('fn_staff_aprobar_publicacion', {
    p_auction_id: id,
    p_intentos_revision: intentosRevision,
    p_idempotency_key: idempotencyKey,
  });
}

export async function rechazarPublicacion(
  id: string,
  intentosRevision: number,
  motivo: string,
  detalle: string,
  idempotencyKey: string,
) {
  return ejecutar('fn_staff_rechazar_publicacion', {
    p_auction_id: id,
    p_intentos_revision: intentosRevision,
    p_motivo: motivo,
    p_detalle: detalle.trim() || null,
    p_idempotency_key: idempotencyKey,
  });
}

export async function despublicarPublicacion(
  id: string,
  mensaje: string,
  aplicarCooldown: boolean,
  motivoInterno: string,
  idempotencyKey: string,
) {
  return ejecutar('fn_staff_despublicar_publicacion', {
    p_auction_id: id,
    p_mensaje: mensaje.trim(),
    p_aplicar_cooldown: aplicarCooldown,
    p_motivo_interno: motivoInterno.trim() || null,
    p_idempotency_key: idempotencyKey,
  });
}
