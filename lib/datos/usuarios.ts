import 'server-only';

import { crearClienteAdmin } from '@/lib/supabase/admin';
import { crearClienteServidor } from '@/lib/supabase/server';
import type {
  CooldownVigente,
  FilaBusquedaUsuario,
  HistorialPenalizaciones,
  Penalizacion,
  SancionVigente,
  UsuarioBasico,
} from '@/lib/tipos/usuarios';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNAS_BUSQUEDA = 'id,alias,first_name,apellido,email,phone,created_at,deletion_scheduled_for';
const COLUMNAS_BASICAS =
  'id,alias,first_name,apellido,fecha_nacimiento,localidad_provincia,localidad_ciudad,created_at,completed_sales,completed_buys,deletion_scheduled_for';
const LIMITE_POR_CAMPO = 25;
const LIMITE_TOTAL = 30;

type FilaUsuarioBusqueda = {
  id: string;
  alias: string;
  first_name: string | null;
  apellido: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  deletion_scheduled_for: string | null;
};

function fallarLectura(error: { message: string } | null) {
  if (error) throw new Error(`No pudimos cargar los datos del panel: ${error.message}`);
}

/** Tapa el mail salvo un par de caracteres: "ju•••@g•••.com". El valor completo no sale de esta función. */
export function ofuscarMail(mail: string | null) {
  if (!mail || !mail.includes('@')) return '—';
  const [local, dominio] = [mail.slice(0, mail.lastIndexOf('@')), mail.slice(mail.lastIndexOf('@') + 1)];
  const punto = dominio.lastIndexOf('.');
  const base = punto > 0 ? dominio.slice(0, punto) : dominio;
  const sufijo = punto > 0 ? dominio.slice(punto) : '';
  const verLocal = local.length > 3 ? 2 : 1;
  return `${local.slice(0, verLocal)}•••@${base.slice(0, 1)}•••${sufijo}`;
}

/** Deja el prefijo de país y los últimos tres dígitos: "+54••••••••678". */
export function ofuscarTelefono(telefono: string | null) {
  if (!telefono) return '—';
  const limpio = telefono.replace(/[^\d+]/g, '');
  if (limpio.length <= 6) return '••••';
  return `${limpio.slice(0, 3)}${'•'.repeat(Math.max(limpio.length - 6, 3))}${limpio.slice(-3)}`;
}

function escaparLike(valor: string) {
  return valor.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
}

function nombreCompleto(fila: { first_name: string | null; apellido: string | null }) {
  return [fila.first_name, fila.apellido].filter(Boolean).join(' ') || 'Sin nombre';
}

/**
 * Busca por ID, usuario público, nombre, mail o teléfono con service_role. El llamador tiene que haber
 * pasado antes por exigirStaff(). Lee el contacto sólo para poder buscar y devuelve ÚNICAMENTE la versión tapada.
 * Una consulta por campo (en vez de .or(...)): el término del moderador nunca se interpola en un filtro.
 */
export async function buscarUsuarios(terminoCrudo: string): Promise<FilaBusquedaUsuario[]> {
  const termino = terminoCrudo.trim().slice(0, 100);
  if (termino.length < 2) return [];

  const admin = crearClienteAdmin();
  const patron = `%${escaparLike(termino)}%`;
  const digitos = termino.replace(/\D/g, '');
  const consultas: PromiseLike<{ data: unknown; error: { message: string } | null }>[] = [];

  if (UUID.test(termino)) {
    consultas.push(admin.from('users').select(COLUMNAS_BUSQUEDA).eq('id', termino.toLowerCase()).limit(1));
  }
  consultas.push(admin.from('users').select(COLUMNAS_BUSQUEDA).ilike('alias', patron).limit(LIMITE_POR_CAMPO));
  consultas.push(admin.from('users').select(COLUMNAS_BUSQUEDA).ilike('first_name', patron).limit(LIMITE_POR_CAMPO));
  consultas.push(admin.from('users').select(COLUMNAS_BUSQUEDA).ilike('apellido', patron).limit(LIMITE_POR_CAMPO));
  consultas.push(admin.from('users').select(COLUMNAS_BUSQUEDA).ilike('email', patron).limit(LIMITE_POR_CAMPO));

  const palabras = termino.split(/\s+/);
  if (palabras.length >= 2) {
    consultas.push(
      admin
        .from('users')
        .select(COLUMNAS_BUSQUEDA)
        .ilike('first_name', `%${escaparLike(palabras[0])}%`)
        .ilike('apellido', `%${escaparLike(palabras.slice(1).join(' '))}%`)
        .limit(LIMITE_POR_CAMPO),
    );
  }
  if (digitos.length >= 4) {
    consultas.push(admin.from('users').select(COLUMNAS_BUSQUEDA).ilike('phone', `%${digitos}%`).limit(LIMITE_POR_CAMPO));
  }

  const resultados = await Promise.all(consultas);
  const filas = new Map<string, FilaUsuarioBusqueda>();
  for (const resultado of resultados) {
    fallarLectura(resultado.error);
    for (const fila of (resultado.data as FilaUsuarioBusqueda[] | null) ?? []) filas.set(fila.id, fila);
  }

  return [...filas.values()]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, LIMITE_TOTAL)
    .map((fila) => ({
      id: fila.id,
      alias: fila.alias,
      nombre: nombreCompleto(fila),
      mailOfuscado: ofuscarMail(fila.email),
      telefonoOfuscado: ofuscarTelefono(fila.phone),
      creadoAt: fila.created_at,
      borradoProgramado: fila.deletion_scheduled_for,
    }));
}

/** Datos básicos de la ficha. Deliberadamente SIN mail ni teléfono: el contacto sólo sale por fn_staff_revelar_contacto. */
export async function obtenerUsuarioBasico(id: string): Promise<UsuarioBasico | null> {
  if (!UUID.test(id)) return null;
  const admin = crearClienteAdmin();
  const { data, error } = await admin.from('users').select(COLUMNAS_BASICAS).eq('id', id.toLowerCase()).maybeSingle();
  fallarLectura(error);
  if (!data) return null;
  const fila = data as {
    id: string;
    alias: string;
    first_name: string | null;
    apellido: string | null;
    fecha_nacimiento: string | null;
    localidad_provincia: string | null;
    localidad_ciudad: string | null;
    created_at: string;
    completed_sales: number | null;
    completed_buys: number | null;
    deletion_scheduled_for: string | null;
  };
  return {
    id: fila.id,
    alias: fila.alias,
    firstName: fila.first_name,
    apellido: fila.apellido,
    fechaNacimiento: fila.fecha_nacimiento,
    provincia: fila.localidad_provincia,
    ciudad: fila.localidad_ciudad,
    creadoAt: fila.created_at,
    ventasCompletadas: fila.completed_sales ?? 0,
    comprasCompletadas: fila.completed_buys ?? 0,
    borradoProgramado: fila.deletion_scheduled_for,
  };
}

/**
 * Historial de penalizaciones y sanción vigente, por el wrapper con la sesión del staff. De acá sale el estado
 * de la cuenta: nunca se deriva en el cliente ni se cachea.
 */
export async function obtenerHistorial(
  id: string,
): Promise<{ ok: true; historial: HistorialPenalizaciones } | { ok: false; codigo: string }> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc('fn_staff_historial_penalizaciones', { p_user_id: id });
  if (error) return { ok: false, codigo: error.code === '42501' ? 'FORBIDDEN' : 'HISTORIAL_NO_DISPONIBLE' };

  const respuesta = data as {
    error?: string;
    sancion_vigente?: SancionVigente | null;
    penalizaciones?: Penalizacion[];
  } | null;
  if (!respuesta || respuesta.error || !Array.isArray(respuesta.penalizaciones)) {
    return { ok: false, codigo: respuesta?.error ?? 'HISTORIAL_NO_DISPONIBLE' };
  }
  return {
    ok: true,
    historial: { sancionVigente: respuesta.sancion_vigente ?? null, penalizaciones: respuesta.penalizaciones },
  };
}

type FilaCooldown = { valuation_variant_id: string; hasta: string; created_at: string };
type FilaVariante = {
  id: string;
  catalog_item_id: string;
  modalidad: string;
  condicion: string | null;
  empresa: string | null;
  grado: string | null;
};

function describirVariante(variante: FilaVariante | undefined, nombre: string | undefined) {
  if (!variante) return 'Ítem de catálogo no disponible';
  const detalle =
    variante.modalidad === 'graded'
      ? [variante.empresa, variante.grado].filter(Boolean).join(' ')
      : variante.modalidad === 'sealed'
        ? 'Sellado'
        : (variante.condicion ?? '').toUpperCase();
  return [nombre ?? 'Ítem de catálogo', detalle].filter(Boolean).join(' · ');
}

/** Cooldowns todavía vigentes de un vendedor (public.cooldowns_vendedor_item), por service_role desde el server. */
export async function obtenerCooldownsVigentes(userId: string): Promise<CooldownVigente[]> {
  const admin = crearClienteAdmin();
  const { data, error } = await admin
    .from('cooldowns_vendedor_item')
    .select('valuation_variant_id,hasta,created_at')
    .eq('seller_id', userId)
    .gt('hasta', new Date().toISOString())
    .order('hasta', { ascending: true });
  fallarLectura(error);
  const cooldowns = (data as FilaCooldown[] | null) ?? [];
  if (cooldowns.length === 0) return [];

  const { data: variantes, error: errorVariantes } = await admin
    .from('valuation_variants')
    .select('id,catalog_item_id,modalidad,condicion,empresa,grado')
    .in('id', cooldowns.map((fila) => fila.valuation_variant_id));
  fallarLectura(errorVariantes);
  const variantesPorId = new Map(((variantes as FilaVariante[] | null) ?? []).map((fila) => [fila.id, fila]));

  const idsItems = [...new Set([...variantesPorId.values()].map((fila) => fila.catalog_item_id))];
  const { data: items, error: errorItems } = idsItems.length
    ? await admin.from('catalog_items').select('id,nombre').in('id', idsItems)
    : { data: [], error: null };
  fallarLectura(errorItems);
  const nombresPorId = new Map(((items as { id: string; nombre: string }[] | null) ?? []).map((fila) => [fila.id, fila.nombre]));

  return cooldowns.map((fila) => {
    const variante = variantesPorId.get(fila.valuation_variant_id);
    return {
      varianteId: fila.valuation_variant_id,
      descripcion: describirVariante(variante, variante ? nombresPorId.get(variante.catalog_item_id) : undefined),
      hasta: fila.hasta,
      desde: fila.created_at,
    };
  });
}

/** Títulos de las publicaciones que impiden una sanción (PENDING_SELLER_DECISION). */
export async function obtenerTitulosPublicaciones(ids: string[]) {
  const validos = ids.filter((id) => UUID.test(id)).slice(0, 20);
  if (validos.length === 0) return [];
  const admin = crearClienteAdmin();
  const { data, error } = await admin.from('auctions').select('id,item_id').in('id', validos);
  fallarLectura(error);
  const publicaciones = (data as { id: string; item_id: string }[] | null) ?? [];
  const { data: items, error: errorItems } = await admin
    .from('items')
    .select('id,title')
    .in('id', [...new Set(publicaciones.map((fila) => fila.item_id))]);
  fallarLectura(errorItems);
  const titulos = new Map(((items as { id: string; title: string }[] | null) ?? []).map((fila) => [fila.id, fila.title]));
  return validos.map((id) => ({
    id,
    titulo: titulos.get(publicaciones.find((fila) => fila.id === id)?.item_id ?? '') ?? 'Publicación sin título',
  }));
}
