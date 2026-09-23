export type TipoPenalizacion = 'advertencia' | 'suspension' | 'bloqueo_definitivo';
export type EstadoPenalizacion = 'aplicada' | 'vigente' | 'vencida' | 'levantada';

export type EfectosSancion = {
  publicaciones_canceladas?: number;
  publicaciones_afectadas?: string[];
  ofertas_rechazadas?: number;
  operaciones_dadas_de_baja?: number;
  contrapartes_avisadas?: number;
  creditos_a_contraparte?: number;
};

export type Penalizacion = {
  id: string;
  tipo: TipoPenalizacion;
  escalon: string | null;
  motivo: string;
  aplicada_por: string;
  aplicada_at: string;
  vence_at: string | null;
  levantada_at: string | null;
  levantada_por: string | null;
  levantada_motivo: string | null;
  estado: EstadoPenalizacion;
  efectos: EfectosSancion | null;
};

export type SancionVigente = {
  id: string;
  tipo: Exclude<TipoPenalizacion, 'advertencia'>;
  escalon: string | null;
  vence_at: string | null;
};

export type HistorialPenalizaciones = {
  sancionVigente: SancionVigente | null;
  penalizaciones: Penalizacion[];
};

export type FilaBusquedaUsuario = {
  id: string;
  alias: string;
  nombre: string;
  /** Ya viene tapado desde el server: el valor completo nunca llega al navegador. */
  mailOfuscado: string;
  telefonoOfuscado: string;
  creadoAt: string;
  borradoProgramado: string | null;
};

export type UsuarioBasico = {
  id: string;
  alias: string;
  firstName: string | null;
  apellido: string | null;
  fechaNacimiento: string | null;
  provincia: string | null;
  ciudad: string | null;
  creadoAt: string;
  ventasCompletadas: number;
  comprasCompletadas: number;
  borradoProgramado: string | null;
};

export type CooldownVigente = {
  varianteId: string;
  descripcion: string;
  hasta: string;
  desde: string;
};

export type PublicacionImpedimento = { id: string; titulo: string };

export type AvisosEnviados = {
  total: number;
  fallidos: number;
  /** El aviso al suspendido salió mal: hay un reintento con texto fijo. */
  falloAvisoSuspendido: boolean;
};

export type ResultadoAccionUsuario =
  | {
      ok: true;
      replayed: boolean;
      avisos: AvisosEnviados;
      efectos?: EfectosSancion;
      vence_at?: string | null;
      campos?: string[];
      /** Sólo en rehabilitar: hasta cuándo sigue bloqueada la cuenta si quedaba otra sanción. */
      bannedUntil?: string | null;
    }
  | {
      ok: false;
      codigo: string;
      campo?: string;
      publicaciones?: PublicacionImpedimento[];
    };

export type ResultadoRevelado =
  | { ok: true; email: string | null; telefono: string | null }
  | { ok: false; codigo: string };

export const ESCALONES_SUSPENSION = [
  { valor: '1_semana', texto: '1 semana' },
  { valor: '2_semanas', texto: '2 semanas' },
  { valor: '3_semanas', texto: '3 semanas' },
  { valor: '1_mes', texto: '1 mes' },
  { valor: '3_meses', texto: '3 meses' },
  { valor: '6_meses', texto: '6 meses' },
] as const;

export const PROVINCIAS = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos',
  'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro',
  'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
] as const;

export function textoEscalon(escalon: string | null) {
  if (escalon === 'permanente') return 'Definitivo';
  return ESCALONES_SUSPENSION.find((fila) => fila.valor === escalon)?.texto ?? '—';
}
