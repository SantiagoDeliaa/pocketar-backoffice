'use server';

import { revalidatePath } from 'next/cache';
import { exigirStaff } from '@/lib/staff';
import { enviarAvisos } from '@/lib/avisos';
import { llamarRpcStaff } from '@/lib/rpc';
import { obtenerFichaCaso } from '@/lib/datos/reportes';
import { advertirUsuario, bloquearUsuarioDefinitivo, suspenderUsuario } from '@/lib/acciones/usuarios';
import {
  CATEGORIAS_CASO,
  ESTADOS_ABIERTOS,
  type ResultadoCaso,
  type ResultadoRespuesta,
  type ResultadoTomar,
} from '@/lib/tipos/reportes';
import type { ResultadoAccionUsuario } from '@/lib/tipos/usuarios';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ResultadoInterno = { ok: true; replayed: boolean; datos: Record<string, unknown> } | { ok: false; codigo: string };

function refrescar(casoId: string) {
  revalidatePath(`/reportes/${casoId}`);
  revalidatePath('/reportes');
}

function claveValida(clave: string, maximo = 128) {
  return typeof clave === 'string' && clave.length >= 1 && clave.length <= maximo;
}

/**
 * Toma el caso (sin clave de idempotencia: tomar dos veces es un «sin cambios»). Se llama desde el render de la ficha,
 * así que NO revalida rutas; el cliente refresca con router.refresh(). Con reasignar: true se lo lleva a otra persona.
 */
export async function tomarCaso(casoId: string, reasignar = false): Promise<ResultadoTomar> {
  await exigirStaff();
  if (!UUID.test(casoId)) return { ok: false, codigo: 'CASE_NOT_FOUND' };
  const respuesta = await llamarRpcStaff('fn_staff_tomar_caso', { p_caso_id: casoId, p_reasignar: reasignar });
  if (!respuesta.ok) return { ok: false, codigo: respuesta.codigo };
  return { ok: true, sinCambios: respuesta.datos.sin_cambios === true };
}

/** Ejecuta una RPC de caso con clave. El llamador ya pasó por exigirStaff(); la tercera barrera es staff.es_staff() adentro. */
async function ejecutar(
  nombre: string,
  casoId: string,
  parametros: Record<string, unknown>,
  clave: string,
): Promise<ResultadoInterno> {
  if (!UUID.test(casoId)) return { ok: false, codigo: 'CASE_NOT_FOUND' };
  if (!claveValida(clave)) return { ok: false, codigo: 'INVALID_IDEMPOTENCY_KEY' };
  const respuesta = await llamarRpcStaff(nombre, { p_caso_id: casoId, ...parametros, p_idempotency_key: clave });
  if (!respuesta.ok) return { ok: false, codigo: respuesta.codigo };
  refrescar(casoId);
  return { ok: true, replayed: respuesta.datos.replayed === true, datos: respuesta.datos };
}

function simple(resultado: ResultadoInterno): ResultadoCaso {
  return resultado.ok ? { ok: true, replayed: resultado.replayed } : resultado;
}

export async function clasificarCaso(casoId: string, categoria: string, clave: string): Promise<ResultadoCaso> {
  await exigirStaff();
  if (!(CATEGORIAS_CASO as readonly string[]).includes(categoria)) return { ok: false, codigo: 'INVALID_CATEGORY' };
  return simple(await ejecutar('fn_staff_clasificar_caso', casoId, { p_categoria: categoria }, clave));
}

export async function cambiarEstadoCaso(casoId: string, estado: string, clave: string): Promise<ResultadoCaso> {
  await exigirStaff();
  if (!(ESTADOS_ABIERTOS as string[]).includes(estado)) return { ok: false, codigo: 'INVALID_STATE' };
  return simple(await ejecutar('fn_staff_cambiar_estado_caso', casoId, { p_estado: estado }, clave));
}

export async function agregarNotaCaso(casoId: string, texto: string, clave: string): Promise<ResultadoCaso> {
  await exigirStaff();
  const limpio = texto.trim();
  if (!limpio) return { ok: false, codigo: 'TEXT_REQUIRED' };
  return simple(await ejecutar('fn_staff_agregar_nota_caso', casoId, { p_texto: limpio }, clave));
}

/**
 * Responde al reportante (un mensaje, sin conversación). Tras una respuesta nueva reenvía `notificar` a
 * send_notification con ya_persistida: true. Si el envío falla no se revierte nada: queda logueado y se avisa.
 */
export async function responderCaso(casoId: string, texto: string, clave: string): Promise<ResultadoRespuesta> {
  await exigirStaff();
  const limpio = texto.trim();
  if (!limpio) return { ok: false, codigo: 'TEXT_REQUIRED' };
  const resultado = await ejecutar('fn_staff_responder_caso', casoId, { p_texto: limpio }, clave);
  if (!resultado.ok) return resultado;

  let avisoFallido = false;
  if (!resultado.replayed) {
    try {
      avisoFallido = (await enviarAvisos(resultado.datos.notificar)).fallidos > 0;
    } catch (error) {
      console.error('No pudimos reenviar el aviso de la respuesta al reportante.', error);
      avisoFallido = true;
    }
  }
  return { ok: true, replayed: resultado.replayed, avisoFallido };
}

export async function resolverCaso(casoId: string, resolucion: string, clave: string): Promise<ResultadoCaso> {
  await exigirStaff();
  const limpia = resolucion.trim();
  if (!limpia) return { ok: false, codigo: 'RESOLUTION_REQUIRED' };
  return simple(await ejecutar('fn_staff_resolver_caso', casoId, { p_resolucion: limpia }, clave));
}

export async function desestimarCaso(casoId: string, resolucion: string, clave: string): Promise<ResultadoCaso> {
  await exigirStaff();
  const limpia = resolucion.trim();
  if (!limpia) return { ok: false, codigo: 'RESOLUTION_REQUIRED' };
  return simple(await ejecutar('fn_staff_desestimar_caso', casoId, { p_resolucion: limpia }, clave));
}

export type TipoSancion = 'advertir' | 'suspender' | 'bloquear';

/**
 * Sanciona desde el caso con las MISMAS acciones del Bloque 4 y después vincula la penalización devuelta. La clave del
 * intento sirve para la sanción y, derivada, para el vínculo: si el vínculo falla y se reintenta, la sanción vuelve como
 * replay (no se repite ni se re-notifica) y sólo se reintenta el vínculo. Sólo se sanciona a una de las dos partes.
 */
export async function sancionarDesdeCaso(
  casoId: string,
  userId: string,
  tipo: TipoSancion,
  escalon: string | null,
  motivo: string,
  clave: string,
): Promise<ResultadoAccionUsuario> {
  await exigirStaff();
  if (!UUID.test(casoId) || !UUID.test(userId)) return { ok: false, codigo: 'INVALID_INPUT' };
  if (!claveValida(clave, 100)) return { ok: false, codigo: 'INVALID_IDEMPOTENCY_KEY' };

  const ficha = await obtenerFichaCaso(casoId);
  if (!ficha.ok) return { ok: false, codigo: ficha.codigo };
  const partes = [ficha.ficha.partes.reportante, ficha.ficha.partes.reportado];
  if (!partes.some((parte) => parte?.user_id === userId)) return { ok: false, codigo: 'PENALIZACION_NOT_RELATED' };

  const sancion =
    tipo === 'advertir'
      ? await advertirUsuario(userId, motivo, clave)
      : tipo === 'bloquear'
        ? await bloquearUsuarioDefinitivo(userId, motivo, clave)
        : await suspenderUsuario(userId, escalon ?? '', motivo, clave);
  if (!sancion.ok) return sancion;
  if (!sancion.penalizacionId) return { ok: false, codigo: 'VINCULO_SANCION_SIN_ID' };

  const vinculo = await ejecutar(
    'fn_staff_vincular_sancion_caso',
    casoId,
    { p_penalizacion_id: sancion.penalizacionId },
    `${clave}-vinculo`,
  );
  // Si el vínculo ya existía (reintento cuyo primer intento sí llegó), el resultado es el buscado.
  if (!vinculo.ok && vinculo.codigo !== 'ALREADY_LINKED') return { ok: false, codigo: `VINCULO_${vinculo.codigo}` };
  return { ...sancion, vinculadaACaso: true };
}
