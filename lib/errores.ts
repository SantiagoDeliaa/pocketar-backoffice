/**
 * Traduce cada código de negocio de las RPC de staff a un mensaje para el moderador.
 * Nunca se muestra el código crudo. Sin datos personales en ningún texto.
 */
const MENSAJES: Record<string, string> = {
  MOTIVE_REQUIRED: 'Escribí el motivo. Es obligatorio.',
  MOTIVE_TOO_LONG: 'El motivo es demasiado largo. Acortalo.',
  MOTIVE_CONTAINS_PERSONAL_DATA:
    'El motivo parece incluir un mail, un teléfono u otro número largo. Sacá los datos personales y volvé a escribirlo.',
  USER_NOT_FOUND: 'No encontramos esa cuenta. Puede que ya no exista.',
  SELF_ACTION: 'Esta cuenta está vinculada a la tuya. No podés moderar tu propia cuenta.',
  INVALID_ESCALON: 'El escalón elegido no es válido. Elegí uno de la lista.',
  ACCOUNT_ALREADY_SUSPENDED:
    'Esta cuenta ya tiene una suspensión vigente. Si querés cambiarla, rehabilitala primero desde el historial.',
  ACCOUNT_ALREADY_BLOCKED: 'Esta cuenta ya está bloqueada definitivamente.',
  PENDING_SELLER_DECISION:
    'No se aplicó nada: esta cuenta tiene la oferta que un vendedor tiene que resolver en una publicación cerrada.',
  CASE_NOT_FOUND: 'No encontramos ese caso. Puede que ya no exista.',
  SELF_CASE: 'Este caso es de una cuenta vinculada a la tuya. No podés intervenir en él.',
  QUEUE_EMPTY: 'No hay casos sin asignar en la bandeja.',
  CASE_CLOSED: 'Este caso ya está cerrado y no se reabre. Sólo admite clasificación, notas y vincular sanciones.',
  ASSIGNED_TO_OTHER: 'Otra persona tiene tomado este caso.',
  NOT_ASSIGNED: 'Este caso no lo tenés tomado vos. Tomalo primero y volvé a intentar.',
  INVALID_CATEGORY: 'La categoría elegida no es válida. Elegí una de la lista.',
  INVALID_STATE: 'El estado elegido no es válido. Para cerrar el caso usá «Resolver» o «Desestimar».',
  STATE_UNCHANGED: 'El caso ya está en ese estado.',
  INVALID_FILTER: 'Alguno de los filtros no es válido. Probá quitarlos.',
  TEXT_REQUIRED: 'Escribí el texto. Es obligatorio.',
  TEXT_TOO_LONG: 'El texto es demasiado largo. Acortalo.',
  TEXT_CONTAINS_PERSONAL_DATA:
    'El mensaje parece incluir un mail, un teléfono u otro número largo. Sacá los datos personales y volvé a escribirlo: el reportante lo lee y nunca puede llevar datos de contacto de la contraparte.',
  REPORTER_NOT_FOUND: 'La cuenta de quien reportó ya no existe, así que no hay a quién responderle.',
  RESOLUTION_REQUIRED: 'Escribí la resolución. Es obligatoria.',
  RESOLUTION_TOO_LONG: 'La resolución es demasiado larga. Acortala.',
  PENALIZACION_NOT_RELATED: 'Esa sanción no corresponde a ninguna de las dos partes de este caso, así que no se puede vincular.',
  ALREADY_LINKED: 'Esa sanción ya estaba vinculada a este caso.',
  VINCULO_SANCION_SIN_ID: 'La sanción se aplicó pero no pudimos identificarla para vincularla al caso.',
  PENALIZACION_NOT_FOUND: 'No encontramos esa penalización. Actualizá la ficha.',
  NOT_LIFTABLE: 'Las advertencias no se levantan: no bloquean nada.',
  ALREADY_LIFTED: 'Esta penalización ya estaba levantada. Actualizá la ficha.',
  ALREADY_EXPIRED: 'Esta suspensión ya venció sola. No hay nada que levantar.',
  COOLDOWN_NOT_FOUND: 'Ese cooldown ya no existe. Actualizá la ficha.',
  COOLDOWN_NOT_ACTIVE: 'Ese cooldown ya venció. No hay nada que anular.',
  ALIAS_ALREADY_FREE: 'El nombre de usuario de esta cuenta ya está liberado.',
  ALIAS_CONFLICT: 'No pudimos liberar el nombre de usuario porque hubo un conflicto. Probá de nuevo en un momento.',
  INVALID_PHONE: 'El teléfono no es válido. Tiene que ser un número argentino, por ejemplo 011 5000-1234.',
  PHONE_TAKEN: 'Ese teléfono ya está en uso por otra cuenta.',
  DETAIL_REQUIRED: 'Escribí el detalle del rechazo. El vendedor lo lee y es obligatorio.',
  IDEMPOTENCY_KEY_REUSED:
    'Esta operación ya se había enviado con otros datos. Cerrá este cuadro y abrilo de nuevo para empezar de cero.',
  INVALID_IDEMPOTENCY_KEY: 'No pudimos identificar el intento. Cerrá este cuadro y abrilo de nuevo.',
  INVALID_INPUT: 'Faltan datos o alguno no es válido. Revisá el formulario.',
  FORBIDDEN: 'Tu sesión ya no tiene permisos de staff. Volvé a iniciar sesión.',
  DEADLOCK: 'Otra operación estaba tocando la misma cuenta. Reintentá: no se aplicó nada.',
  AUTH_FALLO: 'El envío falló. Quedó registrado como error; podés reintentar.',
  SIN_CAMBIOS: 'No cambiaste ningún dato. Completá al menos un campo.',
  EMAIL_YA_VERIFICADO: 'El mail de esta cuenta ya está verificado. No hace falta reenviar nada.',
  AVISO_NO_ENVIADO: 'El aviso no salió. Revisá que el envío de mails esté configurado y reintentá.',
  SIN_SANCION_VIGENTE: 'La cuenta ya no tiene una suspensión vigente, así que no hay aviso que reenviar.',
};

const CAMPOS: Record<string, string> = {
  first_name: 'el nombre',
  apellido: 'el apellido',
  fecha_nacimiento: 'la fecha de nacimiento',
  localidad_provincia: 'la provincia',
  localidad_ciudad: 'la ciudad',
  phone: 'el teléfono',
};

export function mensajeDeError(codigo: string, campo?: string): string {
  if (codigo.startsWith('VINCULO_') && MENSAJES[codigo] === undefined) {
    return `La sanción se aplicó, pero no quedó vinculada al caso. ${mensajeDeError(codigo.slice('VINCULO_'.length))} Reintentá: la sanción no se repite.`;
  }
  if (codigo === 'INVALID_FIELD') {
    return `${campo && CAMPOS[campo] ? `Revisá ${CAMPOS[campo]}` : 'Revisá los datos'}: el valor no es válido.`;
  }
  return MENSAJES[codigo] ?? 'No pudimos completar la operación. No se aplicó ningún cambio.';
}

export const AVISO_MOTIVO =
  'No escribas datos personales del usuario (mail, teléfono, nombre, dirección). Este texto queda registrado y no se puede borrar.';
