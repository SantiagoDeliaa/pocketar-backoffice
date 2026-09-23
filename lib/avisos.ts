import 'server-only';

import { crearClienteAdmin } from '@/lib/supabase/admin';

export type ResultadoAvisos = {
  total: number;
  fallidos: number;
  /** data.type de los avisos que no salieron, para decidir qué reintento ofrecer. */
  tiposFallidos: string[];
};

const SIN_AVISOS: ResultadoAvisos = { total: 0, fallidos: 0, tiposFallidos: [] };

function tipoDe(aviso: unknown) {
  const datos = (aviso as { data?: { type?: unknown } } | null)?.data;
  return typeof datos?.type === 'string' ? datos.type : 'desconocido';
}

/**
 * Reenvía a la Edge Function send_notification los avisos que devolvió una RPC exitosa.
 * La fila in-app ya la persistió la RPC (ya_persistida: true): acá sólo falta push y mail.
 *
 * Best-effort: si falla, la operación de negocio NO se revierte. Devuelve cuántos salieron mal
 * para que el moderador lo vea.
 */
export async function enviarAvisos(notificar: unknown): Promise<ResultadoAvisos> {
  if (!Array.isArray(notificar) || notificar.length === 0) return SIN_AVISOS;

  const resultado: ResultadoAvisos = { total: notificar.length, fallidos: 0, tiposFallidos: [] };
  const claveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!claveServicio) {
    console.error('No pudimos enviar los avisos externos: falta la configuración de servidor.');
    return { total: notificar.length, fallidos: notificar.length, tiposFallidos: notificar.map(tipoDe) };
  }

  let admin: ReturnType<typeof crearClienteAdmin>;
  try {
    admin = crearClienteAdmin();
  } catch (error) {
    console.error('No pudimos preparar el envío externo posterior a la operación.', error);
    return { total: notificar.length, fallidos: notificar.length, tiposFallidos: notificar.map(tipoDe) };
  }

  for (const aviso of notificar) {
    try {
      const { error } = await admin.functions.invoke('send_notification', {
        body: { ...(aviso as Record<string, unknown>), ya_persistida: true },
        headers: { Authorization: `Bearer ${claveServicio}` },
      });
      if (error) throw error;
    } catch (error) {
      console.error('No pudimos enviar el aviso posterior a la operación.', (error as Error).message);
      resultado.fallidos += 1;
      resultado.tiposFallidos.push(tipoDe(aviso));
    }
  }
  return resultado;
}
