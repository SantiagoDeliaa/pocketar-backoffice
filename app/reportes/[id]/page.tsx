import Link from 'next/link';
import { notFound } from 'next/navigation';
import { exigirStaff } from '@/lib/staff';
import { tomarCaso } from '@/lib/acciones/reportes';
import { obtenerCatalogoRevision } from '@/lib/acciones/revision';
import { obtenerFichaCaso } from '@/lib/datos/reportes';
import { mensajeDeError } from '@/lib/errores';
import { antiguedad, fecha } from '@/lib/formato';
import { textoCategoria, textoEstado } from '@/lib/tipos/reportes';
import { AccionesCaso, type ParteSancionable } from '@/components/acciones-caso';
import { EventosCaso, PublicacionYOperacion, TarjetaParte } from '@/components/ficha-caso';
import { TomarCaso } from '@/components/tomar-caso';

export const dynamic = 'force-dynamic';

export default async function FichaCaso({ params }: { params: Promise<{ id: string }> }) {
  const staff = await exigirStaff();
  const { id } = await params;

  // Al entrar se toma el caso (y un caso abierto pasa a «en revisión»). Si lo tiene otra persona NO se le saca: la
  // ficha lo avisa y ofrece tomarlo con confirmación. Un caso cerrado tampoco se toma: se muestra tal cual.
  const toma = await tomarCaso(id);
  if (!toma.ok && toma.codigo === 'CASE_NOT_FOUND') notFound();
  const ficha = await obtenerFichaCaso(id);
  if (!ficha.ok && ficha.codigo === 'CASE_NOT_FOUND') notFound();

  if (!ficha.ok) {
    return (
      <main className="contenedor detalle">
        <p><Link href="/reportes">← Volver a la bandeja</Link></p>
        <p className="error" role="alert">{mensajeDeError(ficha.codigo)}</p>
      </main>
    );
  }

  const { caso, reporte, partes, eventos } = ficha.ficha;
  const catalogo = await obtenerCatalogoRevision();
  const nombres: Record<string, string> = Object.fromEntries(
    (catalogo.ok ? catalogo.catalogo.miembros : []).map((miembro) => [miembro.user_id, miembro.nombre]),
  );
  const cerrado = caso.estado === 'resuelto' || caso.estado === 'desestimado';
  const otraPersona = caso.asignado_a !== null && caso.asignado_a !== staff.userId;
  const horas = (Date.now() - new Date(caso.created_at).getTime()) / 3_600_000;

  const sancionables: ParteSancionable[] = [
    { parte: partes.reportante, etiqueta: 'Quien reportó' },
    { parte: partes.reportado, etiqueta: 'Persona reportada' },
  ].flatMap(({ parte, etiqueta }) =>
    parte && parte.existe && parte.alias ? [{ userId: parte.user_id, alias: parte.alias, etiqueta }] : [],
  );

  return (
    <main className="contenedor detalle detalle-caso">
      <p><Link href="/reportes">← Volver a la bandeja</Link></p>
      <header className="encabezado-detalle">
        <div>
          <p className="sobrelinea">Caso de reporte</p>
          <h1>{ficha.ficha.publicacion?.item?.title ?? 'Publicación eliminada'}</h1>
          <p>{textoCategoria(caso.categoria)} · abierto hace {antiguedad(horas)} · {fecha(caso.created_at)}</p>
        </div>
        <div className={`estado-cuenta ${cerrado ? 'activa' : ''}`} role="status">
          <span>Estado</span>
          <strong>{textoEstado(caso.estado)}</strong>
          <span>{!caso.asignado_a ? 'Sin asignar' : otraPersona ? `Lo tiene ${nombres[caso.asignado_a] ?? 'otra persona'}` : 'Lo tenés vos'}</span>
        </div>
      </header>

      {!toma.ok && toma.codigo !== 'ASSIGNED_TO_OTHER' && toma.codigo !== 'CASE_CLOSED' && (
        <p className="error" role="alert">No pudimos tomar el caso. {mensajeDeError(toma.codigo)}</p>
      )}
      {otraPersona && !cerrado && <TomarCaso casoId={caso.id} nombreActual={nombres[caso.asignado_a!] ?? 'otra persona'} />}
      {cerrado && (
        <div className="aviso" role="note">
          <p><strong>Caso {caso.estado === 'resuelto' ? 'resuelto' : 'desestimado'}{caso.cerrado_at ? ` el ${fecha(caso.cerrado_at)}` : ''}.</strong> No se reabre.</p>
          {caso.resolucion && <p className="texto-libre">Resolución: {caso.resolucion}</p>}
        </div>
      )}

      <section className="bloque" aria-labelledby="reporte-caso">
        <h2 id="reporte-caso">Lo que reportó el usuario</h2>
        {reporte ? (
          <>
            <p className="ayuda">{fecha(reporte.created_at)}</p>
            <p className="texto-libre">{reporte.description?.trim() || 'El reporte no tiene texto.'}</p>
          </>
        ) : (
          <p className="ayuda">El reporte se borró después de abrirse el caso.</p>
        )}
      </section>

      <PublicacionYOperacion ficha={ficha.ficha} />

      <div className="partes-caso">
        <TarjetaParte parte={partes.reportante} etiqueta="Quien reportó" nombres={nombres} />
        <TarjetaParte parte={partes.reportado} etiqueta="Persona reportada" nombres={nombres} />
      </div>

      <EventosCaso eventos={eventos} nombres={nombres} />

      <AccionesCaso
        casoId={caso.id}
        estado={caso.estado}
        categoria={caso.categoria}
        respondidoAt={caso.respondido_at}
        partes={sancionables}
      />
    </main>
  );
}
