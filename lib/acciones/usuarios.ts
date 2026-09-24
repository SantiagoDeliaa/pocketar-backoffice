'use server';

import { revalidatePath } from 'next/cache';
import { exigirStaff } from '@/lib/staff';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { enviarAvisos } from '@/lib/avisos';
import { llamarRpcStaff } from '@/lib/rpc';
import { obtenerHistorial, obtenerTitulosPublicaciones } from '@/lib/datos/usuarios';
import type {
  AvisosEnviados,
  EfectosSancion,
  ResultadoAccionUsuario,
  ResultadoRevelado,
} from '@/lib/tipos/usuarios';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ESCALONES = ['1_semana', '2_semanas', '3_semanas', '1_mes', '3_meses', '6_meses'];
const CAMPOS_CORREGIBLES = ['first_name', 'apellido', 'fecha_nacimiento', 'localidad_provincia', 'localidad_ciudad', 'phone'];
const REDIRECCION_APP = 'pocketar://auth/callback';

// Texto fijo del aviso al suspendido (docs/suspension-de-cuentas.md §5). Sólo se usa para reintentar el envío.
const AVISO_SUSPENDIDO = {
  title: 'Tu cuenta fue suspendida',
  body: 'Tu cuenta de Pocketar fue suspendida. Si creés que es un error, escribinos a pocketar.dev@gmail.com.',
  data: { type: 'account_suspended' },
};

function fallo(codigo: string): ResultadoAccionUsuario {
  return { ok: false, codigo };
}

function refrescarPantallas(userId: string | null) {
  if (userId) revalidatePath(`/usuarios/${userId}`);
  revalidatePath('/usuarios');
  revalidatePath('/');
  revalidatePath('/revision');
  revalidatePath('/publicaciones');
}

/**
 * Pasa por exigirStaff() (segunda barrera), llama al wrapper con la sesión del staff (la tercera barrera es
 * staff.es_staff() adentro) y, si salió bien, reenvía los avisos. Un fallo del reenvío no revierte nada.
 */
async function ejecutar(
  nombre: string,
  parametros: Record<string, unknown>,
  userId: string | null,
): Promise<ResultadoAccionUsuario> {
  await exigirStaff();
  const respuesta = await llamarRpcStaff(nombre, parametros);

  if (!respuesta.ok) {
    if (respuesta.codigo === 'PENDING_SELLER_DECISION') {
      const ids = Array.isArray(respuesta.datos?.auction_ids) ? (respuesta.datos.auction_ids as string[]) : [];
      let publicaciones = ids.map((id) => ({ id, titulo: 'Publicación' }));
      try {
        publicaciones = await obtenerTitulosPublicaciones(ids);
      } catch (error) {
        console.error('No pudimos leer los títulos de las publicaciones que impiden la sanción.', error);
      }
      return { ok: false, codigo: respuesta.codigo, publicaciones };
    }
    const campo = typeof respuesta.datos?.campo === 'string' ? respuesta.datos.campo : undefined;
    return { ok: false, codigo: respuesta.codigo, campo };
  }

  const datos = respuesta.datos;
  const replayed = datos.replayed === true;
  const resultadoAvisos = replayed ? { total: 0, fallidos: 0, tiposFallidos: [] as string[] } : await enviarAvisos(datos.notificar);
  const avisos: AvisosEnviados = {
    total: resultadoAvisos.total,
    fallidos: resultadoAvisos.fallidos,
    falloAvisoSuspendido: resultadoAvisos.tiposFallidos.includes('account_suspended'),
  };
  refrescarPantallas(userId ?? (typeof datos.user_id === 'string' ? datos.user_id : null));

  return {
    ok: true,
    replayed,
    avisos,
    efectos: (datos.efectos as EfectosSancion | undefined) ?? undefined,
    vence_at: 'vence_at' in datos ? ((datos.vence_at as string | null) ?? null) : undefined,
    penalizacionId: typeof datos.penalizacion_id === 'string' ? datos.penalizacion_id : undefined,
    campos: Array.isArray(datos.campos) ? (datos.campos as string[]) : undefined,
    // Sólo tiene sentido al rehabilitar: al suspender, banned_until es la propia sanción recién aplicada.
    bannedUntil:
      nombre === 'fn_staff_rehabilitar' && 'banned_until' in datos ? ((datos.banned_until as string | null) ?? null) : undefined,
  };
}

function conMotivo(motivo: string) {
  return motivo.trim();
}

export async function advertirUsuario(userId: string, motivo: string, clave: string) {
  if (!UUID.test(userId)) return fallo('INVALID_INPUT');
  return ejecutar('fn_staff_advertir', { p_user_id: userId, p_motivo: conMotivo(motivo), p_idempotency_key: clave }, userId);
}

export async function suspenderUsuario(userId: string, escalon: string, motivo: string, clave: string) {
  if (!UUID.test(userId)) return fallo('INVALID_INPUT');
  if (!ESCALONES.includes(escalon)) return fallo('INVALID_ESCALON');
  return ejecutar(
    'fn_staff_suspender',
    { p_user_id: userId, p_escalon: escalon, p_motivo: conMotivo(motivo), p_idempotency_key: clave },
    userId,
  );
}

export async function bloquearUsuarioDefinitivo(userId: string, motivo: string, clave: string) {
  if (!UUID.test(userId)) return fallo('INVALID_INPUT');
  return ejecutar(
    'fn_staff_bloquear_definitivo',
    { p_user_id: userId, p_motivo: conMotivo(motivo), p_idempotency_key: clave },
    userId,
  );
}

export async function rehabilitarPenalizacion(penalizacionId: string, motivo: string, clave: string) {
  if (!UUID.test(penalizacionId)) return fallo('INVALID_INPUT');
  return ejecutar(
    'fn_staff_rehabilitar',
    { p_penalizacion_id: penalizacionId, p_motivo: conMotivo(motivo), p_idempotency_key: clave },
    null,
  );
}

export async function anularCooldownVendedor(userId: string, varianteId: string, motivo: string, clave: string) {
  if (!UUID.test(userId) || !UUID.test(varianteId)) return fallo('INVALID_INPUT');
  return ejecutar(
    'fn_staff_anular_cooldown',
    { p_user_id: userId, p_valuation_variant_id: varianteId, p_motivo: conMotivo(motivo), p_idempotency_key: clave },
    userId,
  );
}

export async function liberarNombreDeUsuario(userId: string, motivo: string, clave: string) {
  if (!UUID.test(userId)) return fallo('INVALID_INPUT');
  return ejecutar('fn_staff_liberar_alias', { p_user_id: userId, p_motivo: conMotivo(motivo), p_idempotency_key: clave }, userId);
}

/** Mismo criterio que la app (lib/utils/phone.ts): E.164 argentino con el 9 de celular. */
function normalizarTelefonoArgentino(entrada: string) {
  const limpio = entrada.replace(/[^\d+]/g, '');
  const sinPrefijo = limpio.startsWith('+54')
    ? limpio.slice(3)
    : limpio.startsWith('54')
      ? limpio.slice(2)
      : limpio.startsWith('0')
        ? limpio.slice(1)
        : limpio;
  return `+54${sinPrefijo.startsWith('9') ? sinPrefijo : `9${sinPrefijo}`}`;
}

export async function corregirDatosUsuario(userId: string, cambiosCrudos: Record<string, string>, motivo: string, clave: string) {
  if (!UUID.test(userId)) return fallo('INVALID_INPUT');
  const cambios: Record<string, string> = {};
  for (const [campo, valor] of Object.entries(cambiosCrudos ?? {})) {
    if (!CAMPOS_CORREGIBLES.includes(campo) || typeof valor !== 'string' || valor.trim() === '') continue;
    cambios[campo] = campo === 'phone' ? normalizarTelefonoArgentino(valor) : valor.trim();
  }
  if (Object.keys(cambios).length === 0) return fallo('SIN_CAMBIOS');
  if (cambios.phone && !/^\+54\d{10,11}$/.test(cambios.phone)) return fallo('INVALID_PHONE');
  return ejecutar(
    'fn_staff_corregir_datos_usuario',
    { p_user_id: userId, p_cambios: cambios, p_motivo: conMotivo(motivo), p_idempotency_key: clave },
    userId,
  );
}

/**
 * «Ver contacto»: cada clic es una llamada a la RPC y una fila en el log. No hay clave de idempotencia a propósito.
 * La respuesta sólo viaja al componente que la pidió; no se guarda ni se cachea en ningún lado.
 */
export async function revelarContactoUsuario(userId: string, motivo: string): Promise<ResultadoRevelado> {
  await exigirStaff();
  if (!UUID.test(userId)) return { ok: false, codigo: 'INVALID_INPUT' };
  const respuesta = await llamarRpcStaff('fn_staff_revelar_contacto', { p_user_id: userId, p_motivo: motivo.trim() });
  if (!respuesta.ok) return { ok: false, codigo: respuesta.codigo };
  return {
    ok: true,
    email: typeof respuesta.datos.email === 'string' ? respuesta.datos.email : null,
    telefono: typeof respuesta.datos.telefono === 'string' ? respuesta.datos.telefono : null,
  };
}

type AccionAuth = 'reenviar_verificacion' | 'recuperar_password';

/**
 * Reenviar verificación y recuperar contraseña no son RPC de negocio: van por la Auth Admin API (service_role, sólo
 * en el server) y se registran con fn_staff_registrar_accion_auth. Primero se registra, después se llama a Auth; si
 * Auth falla se registra de nuevo con resultado 'error'. El staff nunca ve ni fija una contraseña, ni ve el mail.
 */
async function ejecutarAccionAuth(userId: string, accion: AccionAuth, motivo: string): Promise<ResultadoAccionUsuario> {
  await exigirStaff();
  if (!UUID.test(userId)) return fallo('INVALID_INPUT');

  const admin = crearClienteAdmin();
  const { data: cuenta, error: errorLectura } = await admin.auth.admin.getUserById(userId);
  if (errorLectura || !cuenta?.user) return fallo('USER_NOT_FOUND');
  const correo = cuenta.user.email;
  if (!correo) return fallo('USER_NOT_FOUND');
  if (accion === 'reenviar_verificacion' && cuenta.user.email_confirmed_at) return fallo('EMAIL_YA_VERIFICADO');

  const registro = await llamarRpcStaff('fn_staff_registrar_accion_auth', {
    p_user_id: userId,
    p_accion: accion,
    p_motivo: motivo.trim(),
    p_resultado: 'ok',
  });
  if (!registro.ok) return fallo(registro.codigo);

  const { error } =
    accion === 'reenviar_verificacion'
      ? await admin.auth.resend({ type: 'signup', email: correo, options: { emailRedirectTo: REDIRECCION_APP } })
      : await admin.auth.resetPasswordForEmail(correo, { redirectTo: REDIRECCION_APP });

  if (error) {
    console.error('Falló la acción de Auth.', accion, error.status ?? error.name);
    const reintento = await llamarRpcStaff('fn_staff_registrar_accion_auth', {
      p_user_id: userId,
      p_accion: accion,
      p_motivo: motivo.trim(),
      p_resultado: 'error',
    });
    if (!reintento.ok) console.error('No pudimos registrar el error de la acción de Auth.', reintento.codigo);
    return fallo('AUTH_FALLO');
  }

  refrescarPantallas(userId);
  return { ok: true, replayed: false, avisos: { total: 0, fallidos: 0, falloAvisoSuspendido: false } };
}

export async function reenviarVerificacionMail(userId: string, motivo: string) {
  return ejecutarAccionAuth(userId, 'reenviar_verificacion', motivo);
}

export async function dispararRecuperacionPassword(userId: string, motivo: string) {
  return ejecutarAccionAuth(userId, 'recuperar_password', motivo);
}

/**
 * Reintento del aviso al suspendido, con el texto fijo. Sólo mientras la cuenta tenga una sanción vigente: no sirve
 * para mandarle mails a cualquiera. No lleva `notificar` de la RPC porque un replay no lo trae.
 */
export async function reenviarAvisoSuspension(userId: string): Promise<ResultadoAccionUsuario> {
  await exigirStaff();
  if (!UUID.test(userId)) return fallo('INVALID_INPUT');
  const historial = await obtenerHistorial(userId);
  if (!historial.ok) return fallo(historial.codigo);
  if (!historial.historial.sancionVigente) return fallo('SIN_SANCION_VIGENTE');

  const resultado = await enviarAvisos([{ user_ids: [userId], ...AVISO_SUSPENDIDO }]);
  if (resultado.fallidos > 0) return fallo('AVISO_NO_ENVIADO');
  return { ok: true, replayed: false, avisos: { total: 1, fallidos: 0, falloAvisoSuspendido: false } };
}
