import 'server-only';

import { crearClienteAdmin } from '@/lib/supabase/admin';

export type Publicacion = {
  id: string;
  item_id: string;
  seller_id: string;
  status: string;
  currency: string | null;
  opening_price: number | null;
  current_price: number | null;
  min_increment: number | null;
  buy_now_price: number | null;
  duracion_horas: number | null;
  provincia: string | null;
  condicion: string | null;
  is_lot: boolean | null;
  images: string[] | null;
  description: string | null;
  created_at: string;
  starts_at: string | null;
  ends_at: string | null;
  intentos_revision: number;
  revisor_asignado_a: string | null;
  revisor_asignado_at: string | null;
  motivo_rechazo: string | null;
  motivo_rechazo_detalle: string | null;
  revisado_por: string | null;
  revisado_at: string | null;
};

type Item = {
  id: string;
  title: string;
  game: string | null;
  attributes: Record<string, unknown> | null;
  valuation_variant_id: string | null;
};

type Vendedor = {
  id: string;
  alias: string;
  created_at: string;
  completed_sales: number | null;
  completed_buys: number | null;
  localidad_provincia: string | null;
};

export type FilaRevision = Publicacion & {
  item: Item | null;
  vendedor: Vendedor | null;
};

const COLUMNAS_PUBLICACION =
  'id,item_id,seller_id,status,currency,opening_price,current_price,min_increment,buy_now_price,duracion_horas,provincia,condicion,is_lot,images,description,created_at,starts_at,ends_at,intentos_revision,revisor_asignado_a,revisor_asignado_at,motivo_rechazo,motivo_rechazo_detalle,revisado_por,revisado_at';

const COLUMNAS_ITEM = 'id,title,game,attributes,valuation_variant_id';
const COLUMNAS_VENDEDOR =
  'id,alias,created_at,completed_sales,completed_buys,localidad_provincia';

function fallarLectura(error: { message: string } | null) {
  if (error) throw new Error(`No pudimos cargar los datos del panel: ${error.message}`);
}

async function enriquecerPublicaciones(publicaciones: Publicacion[]): Promise<FilaRevision[]> {
  if (publicaciones.length === 0) return [];

  const admin = crearClienteAdmin();
  const idsItems = [...new Set(publicaciones.map((fila) => fila.item_id))];
  const idsVendedores = [...new Set(publicaciones.map((fila) => fila.seller_id))];

  const [itemsResultado, vendedoresResultado] = await Promise.all([
    admin.from('items').select(COLUMNAS_ITEM).in('id', idsItems),
    admin.from('users').select(COLUMNAS_VENDEDOR).in('id', idsVendedores),
  ]);
  fallarLectura(itemsResultado.error);
  fallarLectura(vendedoresResultado.error);

  const itemsPorId = new Map((itemsResultado.data as Item[] | null ?? []).map((fila) => [fila.id, fila]));
  const vendedoresPorId = new Map(
    (vendedoresResultado.data as Vendedor[] | null ?? []).map((fila) => [fila.id, fila]),
  );

  return publicaciones.map((fila) => ({
    ...fila,
    item: itemsPorId.get(fila.item_id) ?? null,
    vendedor: vendedoresPorId.get(fila.seller_id) ?? null,
  }));
}

export async function obtenerColaRevision(): Promise<FilaRevision[]> {
  const admin = crearClienteAdmin();
  const { data, error } = await admin
    .from('auctions')
    .select(COLUMNAS_PUBLICACION)
    .eq('status', 'en_revision')
    .order('starts_at', { ascending: true });
  fallarLectura(error);
  return enriquecerPublicaciones((data as Publicacion[] | null) ?? []);
}

export async function obtenerPublicacionesAbiertas(): Promise<FilaRevision[]> {
  const admin = crearClienteAdmin();
  const { data, error } = await admin
    .from('auctions')
    .select(COLUMNAS_PUBLICACION)
    .eq('status', 'open')
    .order('starts_at', { ascending: false });
  fallarLectura(error);
  return enriquecerPublicaciones((data as Publicacion[] | null) ?? []);
}

export async function obtenerResumenInicio() {
  const admin = crearClienteAdmin();
  const ahora = new Date();
  const inicioVentanaPorVencer = new Date(ahora.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const finVentanaPorVencer = new Date(ahora.getTime() - 42 * 60 * 60 * 1000).toISOString();
  const [cola, porVencer, activas] = await Promise.all([
    admin.from('auctions').select('id,starts_at', { count: 'exact' }).eq('status', 'en_revision').order('starts_at', { ascending: true }).limit(1),
    admin.from('auctions').select('id', { count: 'exact', head: true }).eq('status', 'en_revision').gt('starts_at', inicioVentanaPorVencer).lte('starts_at', finVentanaPorVencer),
    admin.from('auctions').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);
  fallarLectura(cola.error);
  fallarLectura(porVencer.error);
  fallarLectura(activas.error);

  return {
    enCola: cola.count ?? 0,
    porVencer: porVencer.count ?? 0,
    activas: activas.count ?? 0,
    masAntigua: (cola.data?.[0] as { starts_at: string | null } | undefined)?.starts_at ?? null,
  };
}

export async function obtenerComplementoRevision(id: string) {
  const admin = crearClienteAdmin();
  const { data: publicacion, error: errorPublicacion } = await admin
    .from('auctions')
    .select('item_id,seller_id')
    .eq('id', id)
    .maybeSingle();
  fallarLectura(errorPublicacion);
  if (!publicacion) return null;

  const [item, publicaciones] = await Promise.all([
    admin.from('items').select(COLUMNAS_ITEM).eq('id', publicacion.item_id).maybeSingle(),
    admin.from('auctions').select('id', { count: 'exact', head: true }).eq('seller_id', publicacion.seller_id),
  ]);
  fallarLectura(item.error);
  fallarLectura(publicaciones.error);
  return {
    atributos: (item.data as Item | null)?.attributes ?? null,
    publicacionesTotales: publicaciones.count ?? 0,
  };
}
