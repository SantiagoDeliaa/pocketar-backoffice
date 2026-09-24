import 'server-only';

import { llamarRpcStaff } from '@/lib/rpc';
import {
  CATEGORIAS_CASO,
  ESTADOS_CASO,
  LIMITE_BANDEJA,
  type Bandeja,
  type FichaCaso,
  type FiltrosBandeja,
} from '@/lib/tipos/reportes';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ResultadoBandeja = { ok: true; bandeja: Bandeja } | { ok: false; codigo: string };
export type ResultadoFicha = { ok: true; ficha: FichaCaso } | { ok: false; codigo: string };

/** Las lecturas de casos van por RPC con la sesión del staff: no llevan p_ip ni p_user_agent. El llamador ya pasó por exigirStaff(). */
export async function obtenerBandeja(filtros: FiltrosBandeja): Promise<ResultadoBandeja> {
  const respuesta = await llamarRpcStaff(
    'fn_staff_listar_casos',
    {
      p_estado: filtros.estado,
      p_categoria: filtros.categoria,
      p_asignado_a: filtros.asignadoA,
      p_sin_asignar: filtros.sinAsignar,
      p_limite: LIMITE_BANDEJA,
      p_offset: (Math.max(filtros.pagina, 1) - 1) * LIMITE_BANDEJA,
    },
    { conContexto: false },
  );
  if (!respuesta.ok) return { ok: false, codigo: respuesta.codigo };

  const datos = respuesta.datos;
  const resumen = Object.fromEntries(
    ESTADOS_CASO.map((estado) => [estado, Number((datos.resumen as Record<string, number> | undefined)?.[estado] ?? 0)]),
  ) as Bandeja['resumen'];
  return {
    ok: true,
    bandeja: {
      total: Number(datos.total ?? 0),
      resumen,
      masViejoAbierto: (datos.mas_viejo_abierto as Bandeja['masViejoAbierto']) ?? null,
      casos: Array.isArray(datos.casos) ? (datos.casos as Bandeja['casos']) : [],
    },
  };
}

export async function obtenerFichaCaso(casoId: string): Promise<ResultadoFicha> {
  if (!UUID.test(casoId)) return { ok: false, codigo: 'CASE_NOT_FOUND' };
  const respuesta = await llamarRpcStaff('fn_staff_ficha_caso', { p_caso_id: casoId }, { conContexto: false });
  if (!respuesta.ok) return { ok: false, codigo: respuesta.codigo };

  const datos = respuesta.datos as Record<string, unknown>;
  const partes = (datos.partes ?? {}) as Record<string, unknown>;
  if (!datos.caso || !partes.reportante) return { ok: false, codigo: 'OPERACION_NO_DISPONIBLE' };
  return {
    ok: true,
    ficha: {
      caso: datos.caso as FichaCaso['caso'],
      reporte: (datos.reporte as FichaCaso['reporte']) ?? null,
      publicacion: (datos.publicacion as FichaCaso['publicacion']) ?? null,
      operacion: (datos.operacion as FichaCaso['operacion']) ?? null,
      eventos: Array.isArray(datos.eventos) ? (datos.eventos as FichaCaso['eventos']) : [],
      partes: {
        reportante: partes.reportante as FichaCaso['partes']['reportante'],
        reportado: (partes.reportado as FichaCaso['partes']['reportado']) ?? null,
      },
    },
  };
}

export const ESTADOS_FILTRO = ['activos', ...ESTADOS_CASO] as const;
export const CATEGORIAS_FILTRO: readonly string[] = CATEGORIAS_CASO;
