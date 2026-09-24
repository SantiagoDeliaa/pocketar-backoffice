import Link from 'next/link';
import { exigirStaff } from '@/lib/staff';
import { obtenerBandeja, ESTADOS_FILTRO, CATEGORIAS_FILTRO } from '@/lib/datos/reportes';
import { obtenerCatalogoRevision } from '@/lib/acciones/revision';
import { mensajeDeError } from '@/lib/errores';
import { antiguedad } from '@/lib/formato';
import {
  ESTADOS_CASO,
  LIMITE_BANDEJA,
  TEXTO_CATEGORIA,
  TEXTO_ESTADO,
  textoCategoria,
  textoEstado,
  type CategoriaCaso,
} from '@/lib/tipos/reportes';

export const dynamic = 'force-dynamic';

function primero(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor;
}

function enlace(base: Record<string, string>, cambios: Record<string, string>) {
  const consulta = new URLSearchParams({ ...base, ...cambios });
  for (const [clave, valor] of [...consulta]) if (!valor) consulta.delete(clave);
  const texto = consulta.toString();
  return texto ? `/reportes?${texto}` : '/reportes';
}

export default async function Reportes({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const staff = await exigirStaff();
  const crudos = await searchParams;
  const estadoCrudo = primero(crudos.estado) ?? 'activos';
  const estado = estadoCrudo === 'todos' || (ESTADOS_FILTRO as readonly string[]).includes(estadoCrudo) ? estadoCrudo : 'activos';
  const categoriaCruda = primero(crudos.categoria) ?? '';
  const categoria = CATEGORIAS_FILTRO.includes(categoriaCruda) ? categoriaCruda : '';
  const asignacionCruda = primero(crudos.asignacion) ?? '';
  const asignacion = asignacionCruda === 'mios' || asignacionCruda === 'sin_asignar' ? asignacionCruda : '';
  const paginaCruda = Number.parseInt(primero(crudos.pagina) ?? '1', 10);
  const pagina = Number.isFinite(paginaCruda) && paginaCruda > 0 ? Math.min(paginaCruda, 10_000) : 1;

  const [resultado, catalogo] = await Promise.all([
    obtenerBandeja({
      estado: estado === 'todos' ? null : estado,
      categoria: categoria || null,
      asignadoA: asignacion === 'mios' ? staff.userId : null,
      sinAsignar: asignacion === 'sin_asignar',
      pagina,
    }),
    obtenerCatalogoRevision(),
  ]);
  const nombres: Record<string, string> = Object.fromEntries(
    (catalogo.ok ? catalogo.catalogo.miembros : []).map((miembro) => [miembro.user_id, miembro.nombre]),
  );

  const base = { estado, categoria, asignacion };
  const hayFiltros = estado !== 'activos' || categoria !== '' || asignacion !== '';

  return (
    <main className="contenedor">
      <header className="encabezado">
        <div>
          <p className="sobrelinea">Reportes de usuarios</p>
          <h1>Casos</h1>
          <p>Los casos salen de los reportes que hacen los usuarios sobre una operación. Los más viejos van primero.</p>
        </div>
      </header>

      {!resultado.ok ? (
        <p className="error" role="alert">No pudimos cargar la bandeja. {mensajeDeError(resultado.codigo)} Actualizá la página.</p>
      ) : (
        <>
          <section className="metricas metricas-casos" aria-label="Resumen de la bandeja">
            <article className={`metrica principal ${resultado.bandeja.masViejoAbierto && resultado.bandeja.masViejoAbierto.antiguedad_horas >= 48 ? 'vencido' : ''}`}>
              <span>Caso abierto más viejo</span>
              <strong>{resultado.bandeja.masViejoAbierto ? antiguedad(resultado.bandeja.masViejoAbierto.antiguedad_horas) : 'Sin casos abiertos'}</strong>
              <p>
                {resultado.bandeja.masViejoAbierto
                  ? <Link href={`/reportes/${resultado.bandeja.masViejoAbierto.caso_id}`} prefetch={false}>Ir a ese caso</Link>
                  : 'No hay casos esperando que alguien los tome.'}
              </p>
            </article>
            {ESTADOS_CASO.map((clave) => (
              <article className="metrica" key={clave}>
                <span>{TEXTO_ESTADO[clave]}</span>
                <strong className="mono">{resultado.bandeja.resumen[clave]}</strong>
              </article>
            ))}
          </section>

          <form method="get" action="/reportes" className="filtros-casos" aria-label="Filtros de la bandeja">
            <label>Estado
              <select name="estado" defaultValue={estado}>
                <option value="activos">Activos (no cerrados)</option>
                <option value="todos">Todos</option>
                {ESTADOS_CASO.map((clave) => <option key={clave} value={clave}>{TEXTO_ESTADO[clave]}</option>)}
              </select>
            </label>
            <label>Categoría
              <select name="categoria" defaultValue={categoria}>
                <option value="">Todas</option>
                {(Object.keys(TEXTO_CATEGORIA) as CategoriaCaso[]).map((clave) => <option key={clave} value={clave}>{TEXTO_CATEGORIA[clave]}</option>)}
              </select>
            </label>
            <label>Asignación
              <select name="asignacion" defaultValue={asignacion}>
                <option value="">Todos</option>
                <option value="mios">Asignados a mí</option>
                <option value="sin_asignar">Sin asignar</option>
              </select>
            </label>
            <div className="botonera">
              <button type="submit">Filtrar</button>
              {hayFiltros && <Link className="boton-enlace" href="/reportes">Limpiar</Link>}
            </div>
          </form>

          <p className="resultado">{resultado.bandeja.total} {resultado.bandeja.total === 1 ? 'caso' : 'casos'}</p>

          {resultado.bandeja.casos.length === 0 ? (
            <div className="vacio">
              <h2>{hayFiltros ? 'No hay casos con esos filtros' : 'La bandeja está al día'}</h2>
              <p>{hayFiltros ? 'Probá quitar o cambiar alguno de los filtros.' : 'No hay casos activos en este momento.'}</p>
            </div>
          ) : (
            <div className="lista-publicaciones">
              {resultado.bandeja.casos.map((caso) => (
                <Link href={`/reportes/${caso.id}`} prefetch={false} key={caso.id} className="fila-caso">
                  <div className="sla"><span>Antigüedad</span><strong>{antiguedad(caso.antiguedad_horas)}</strong></div>
                  <div><span>Estado</span><strong>{textoEstado(caso.estado)}</strong><em className="etiqueta-categoria">{textoCategoria(caso.categoria)}</em></div>
                  <div><span>Publicación</span><strong>{caso.publicacion?.titulo ?? 'Publicación eliminada'}</strong></div>
                  <div><span>Reportó</span><strong>{caso.reportante_alias ?? 'Cuenta eliminada'}</strong></div>
                  <div><span>Reportado</span><strong>{caso.reportado_id || caso.reportado_alias ? (caso.reportado_alias ?? 'Cuenta eliminada') : 'Sin contraparte'}</strong></div>
                  <div>
                    <span>Lo tiene</span>
                    <strong>{!caso.asignado_a ? 'Sin asignar' : caso.asignado_a === staff.userId ? 'Vos' : (nombres[caso.asignado_a] ?? 'Otra persona')}</strong>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {resultado.bandeja.total > LIMITE_BANDEJA && (
            <nav className="paginacion" aria-label="Paginación">
              {pagina > 1 ? <Link className="boton-enlace" href={enlace(base, { pagina: String(pagina - 1) })}>← Anterior</Link> : <span />}
              <span className="ayuda">Página {pagina} de {Math.ceil(resultado.bandeja.total / LIMITE_BANDEJA)}</span>
              {pagina * LIMITE_BANDEJA < resultado.bandeja.total ? <Link className="boton-enlace" href={enlace(base, { pagina: String(pagina + 1) })}>Siguiente →</Link> : <span />}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
