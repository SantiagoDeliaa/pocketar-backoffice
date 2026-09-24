import type { Penalizacion, SancionVigente } from '@/lib/tipos/usuarios';

export const ESTADOS_CASO = ['abierto', 'en_revision', 'esperando_usuario', 'resuelto', 'desestimado'] as const;
export type EstadoCaso = (typeof ESTADOS_CASO)[number];
export type EstadoAbierto = 'abierto' | 'en_revision' | 'esperando_usuario';

export const CATEGORIAS_CASO = ['no_se_concreto', 'no_coincide_con_lo_publicado', 'conducta', 'operar_afuera', 'otro'] as const;
export type CategoriaCaso = (typeof CATEGORIAS_CASO)[number];

export const TEXTO_ESTADO: Record<EstadoCaso, string> = {
  abierto: 'Abierto',
  en_revision: 'En revisión',
  esperando_usuario: 'Esperando al usuario',
  resuelto: 'Resuelto',
  desestimado: 'Desestimado',
};

export const TEXTO_CATEGORIA: Record<CategoriaCaso, string> = {
  no_se_concreto: 'No se concretó',
  no_coincide_con_lo_publicado: 'No coincide con lo publicado',
  conducta: 'Conducta',
  operar_afuera: 'Operar afuera',
  otro: 'Otro',
};

export const ESTADOS_ABIERTOS: EstadoAbierto[] = ['abierto', 'en_revision', 'esperando_usuario'];

export function textoEstado(estado: string | null) {
  return (estado && TEXTO_ESTADO[estado as EstadoCaso]) || estado || '—';
}

export function textoCategoria(categoria: string | null) {
  if (!categoria) return 'Sin clasificar';
  return TEXTO_CATEGORIA[categoria as CategoriaCaso] ?? categoria;
}

export const LIMITE_BANDEJA = 50;

export type FiltrosBandeja = {
  /** «activos» agrupa los tres no cerrados; null = todos. */
  estado: string | null;
  categoria: string | null;
  asignadoA: string | null;
  sinAsignar: boolean;
  pagina: number;
};

export type FilaCaso = {
  id: string;
  report_id: string | null;
  auction_id: string | null;
  estado: EstadoCaso;
  categoria: CategoriaCaso | null;
  asignado_a: string | null;
  asignado_at: string | null;
  reportante_id: string | null;
  reportante_alias: string | null;
  reportado_id: string | null;
  reportado_alias: string | null;
  publicacion: { status: string | null; titulo: string | null } | null;
  respondido_at: string | null;
  cerrado_at: string | null;
  created_at: string;
  updated_at: string;
  antiguedad_horas: number;
};

export type Bandeja = {
  total: number;
  resumen: Record<EstadoCaso, number>;
  masViejoAbierto: { caso_id: string; created_at: string; antiguedad_horas: number } | null;
  casos: FilaCaso[];
};

export type CasoFicha = {
  id: string;
  report_id: string | null;
  estado: EstadoCaso;
  categoria: CategoriaCaso | null;
  asignado_a: string | null;
  asignado_at: string | null;
  resolucion: string | null;
  respondido_at: string | null;
  cerrado_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicacionCaso = {
  id: string;
  status: string | null;
  seller_id: string | null;
  currency: string | null;
  current_price: number | null;
  buy_now_price: number | null;
  buy_now_status: string | null;
  ends_at: string | null;
  provincia: string | null;
  condicion: string | null;
  is_lot: boolean | null;
  images: string[] | null;
  description: string | null;
  item: { title: string | null; game: string | null } | null;
};

export type OperacionCaso = {
  estado_publicacion: string | null;
  buy_now_status: string | null;
  comprador_id: string | null;
  vendedor_id: string | null;
  oferta_ganadora: { bidder_id: string | null; amount: number | null; status: string | null } | null;
  contacto_revelado_at: string | null;
  precio_cierre: number | null;
  comprador_confirmo_at: string | null;
  vendedor_confirmo_at: string | null;
  confirmada_at: string | null;
  dada_de_baja: {
    baja_at: string | null;
    parte_suspendida: string | null;
    penalizacion_id: string | null;
    credito_a_contraparte: unknown;
  } | null;
};

export type TipoEvento =
  | 'nota_interna'
  | 'respuesta_usuario'
  | 'cambio_estado'
  | 'clasificacion'
  | 'sancion_vinculada'
  | 'asignacion';

export type EventoCaso = {
  id: string;
  tipo: TipoEvento;
  actor_id: string | null;
  texto: string | null;
  datos: Record<string, unknown> | null;
  created_at: string;
};

export type CasoPrevio = {
  caso_id: string;
  estado: EstadoCaso;
  categoria: CategoriaCaso | null;
  created_at: string;
  cerrado_at: string | null;
  rol: 'reportante' | 'reportado';
};

export type ParteCaso = {
  user_id: string;
  rol_en_caso: 'comprador' | 'vendedor';
  existe: boolean;
  alias: string | null;
  miembro_desde: string | null;
  completed_sales: number | null;
  completed_buys: number | null;
  baja_solicitada: boolean | null;
  sancion_vigente: SancionVigente | null;
  penalizaciones: Penalizacion[];
  casos_previos_total: number;
  casos_previos: CasoPrevio[];
};

export type FichaCaso = {
  caso: CasoFicha;
  reporte: { id: string; description: string | null; created_at: string } | null;
  publicacion: PublicacionCaso | null;
  operacion: OperacionCaso | null;
  eventos: EventoCaso[];
  partes: { reportante: ParteCaso; reportado: ParteCaso | null };
};

export type ResultadoTomar =
  | { ok: true; sinCambios: boolean }
  | { ok: false; codigo: string };

export type ResultadoCaso =
  | { ok: true; replayed: boolean }
  | { ok: false; codigo: string };

/** Resultado de responder, con el estado del reenvío del aviso (best-effort). */
export type ResultadoRespuesta =
  | { ok: true; replayed: boolean; avisoFallido: boolean }
  | { ok: false; codigo: string };
