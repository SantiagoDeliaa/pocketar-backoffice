import Link from 'next/link';
import { HistorialPenalizaciones } from '@/components/historial-penalizaciones';
import { RevelarContacto } from '@/components/revelar-contacto';
import { fecha, moneda } from '@/lib/formato';
import { textoCategoria, textoEstado, type EventoCaso, type FichaCaso, type ParteCaso } from '@/lib/tipos/reportes';
import { textoEscalon } from '@/lib/tipos/usuarios';

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return <div className="dato"><span>{etiqueta}</span><strong>{valor}</strong></div>;
}

function siNo(valor: boolean | null | undefined) {
  return valor ? 'Sí' : 'No';
}

/** Alias de una cuenta por su id, si es una de las dos partes del caso. */
function aliasDe(id: string | null, partes: FichaCaso['partes']) {
  if (!id) return '—';
  const parte = [partes.reportante, partes.reportado].find((candidata) => candidata?.user_id === id);
  if (!parte) return 'Otra cuenta';
  return parte.alias ?? 'Cuenta eliminada';
}

export function PublicacionYOperacion({ ficha }: { ficha: FichaCaso }) {
  const { publicacion, operacion, partes } = ficha;
  return (
    <section className="bloque" aria-labelledby="publicacion-caso">
      <h2 id="publicacion-caso">Publicación y operación</h2>
      {!publicacion ? (
        <p className="ayuda">La publicación ya no existe: se borró después del reporte.</p>
      ) : (
        <>
          <div className="grilla-datos">
            <Dato etiqueta="Título" valor={publicacion.item?.title ?? '—'} />
            <Dato etiqueta="TCG" valor={publicacion.item?.game ?? '—'} />
            <Dato etiqueta="Tipo" valor={publicacion.is_lot ? 'Lote' : 'Publicación'} />
            <Dato etiqueta="Estado de la publicación" valor={publicacion.status ?? '—'} />
            <Dato etiqueta="Precio actual" valor={moneda(publicacion.current_price, publicacion.currency)} />
            <Dato etiqueta="Compra directa" valor={publicacion.buy_now_price === null ? '—' : `${moneda(publicacion.buy_now_price, publicacion.currency)} · ${publicacion.buy_now_status ?? '—'}`} />
            <Dato etiqueta="Cierre" valor={fecha(publicacion.ends_at)} />
            <Dato etiqueta="Provincia" valor={publicacion.provincia ?? '—'} />
            <Dato etiqueta="Condición" valor={publicacion.condicion ?? '—'} />
            <Dato etiqueta="Vendedor" valor={aliasDe(publicacion.seller_id, partes)} />
            <Dato etiqueta="ID de la publicación" valor={publicacion.id} />
          </div>
          {publicacion.description && <div className="dato"><span>Descripción</span><strong>{publicacion.description}</strong></div>}
          {publicacion.images && publicacion.images.length > 0 && (
            <div className="galeria miniaturas-caso">
              {publicacion.images.slice(0, 6).map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <a key={url} href={url} target="_blank" rel="noreferrer noopener" className="miniatura"><img src={url} alt="Foto de la publicación" loading="lazy" /></a>
              ))}
            </div>
          )}
        </>
      )}

      <h3>Estado de la operación</h3>
      {!operacion ? (
        <p className="ayuda">No hay una operación asociada: la publicación no llegó a tener comprador.</p>
      ) : (
        <>
          <div className="grilla-datos">
            <Dato etiqueta="Estado" valor={operacion.estado_publicacion ?? '—'} />
            <Dato etiqueta="Comprador" valor={aliasDe(operacion.comprador_id, partes)} />
            <Dato etiqueta="Vendedor" valor={aliasDe(operacion.vendedor_id, partes)} />
            {operacion.oferta_ganadora && (
              <Dato
                etiqueta="Oferta ganadora"
                valor={`${aliasDe(operacion.oferta_ganadora.bidder_id, partes)} · ${moneda(operacion.oferta_ganadora.amount, publicacion?.currency ?? null)} · ${operacion.oferta_ganadora.status ?? '—'}`}
              />
            )}
            <Dato etiqueta="Precio de cierre" valor={moneda(operacion.precio_cierre, publicacion?.currency ?? null)} />
            <Dato etiqueta="Contacto revelado" valor={fecha(operacion.contacto_revelado_at)} />
            <Dato etiqueta="Confirmó el comprador" valor={fecha(operacion.comprador_confirmo_at)} />
            <Dato etiqueta="Confirmó el vendedor" valor={fecha(operacion.vendedor_confirmo_at)} />
            <Dato etiqueta="Operación confirmada" valor={fecha(operacion.confirmada_at)} />
          </div>
          {operacion.dada_de_baja && (
            <p className="aviso" role="note">
              La operación se dio de baja el {fecha(operacion.dada_de_baja.baja_at)}
              {operacion.dada_de_baja.parte_suspendida ? ` (parte suspendida: ${operacion.dada_de_baja.parte_suspendida})` : ''}.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function textoSancionVigente(parte: ParteCaso) {
  const vigente = parte.sancion_vigente;
  if (!vigente) return 'Ninguna';
  if (vigente.tipo === 'bloqueo_definitivo') return 'Bloqueada definitivamente';
  return `Suspendida hasta ${fecha(vigente.vence_at)} (${textoEscalon(vigente.escalon)})`;
}

export function TarjetaParte({ parte, etiqueta, nombres }: { parte: ParteCaso | null; etiqueta: string; nombres: Record<string, string> }) {
  if (!parte) {
    return (
      <article className="bloque parte-caso">
        <p className="sobrelinea">{etiqueta}</p>
        <h3>Sin contraparte</h3>
        <p className="ayuda">Este reporte no tiene una persona reportada: no había contraparte en la operación.</p>
      </article>
    );
  }
  const vigente = parte.sancion_vigente !== null;
  return (
    <article className="bloque parte-caso">
      <p className="sobrelinea">{etiqueta} · {parte.rol_en_caso === 'comprador' ? 'Comprador' : 'Vendedor'}</p>
      <h3>
        {parte.existe && parte.alias ? <Link href={`/usuarios/${parte.user_id}`}>{parte.alias}</Link> : 'Cuenta eliminada'}
      </h3>
      {!parte.existe ? (
        <p className="ayuda">La cuenta se borró después del reporte. No hay más datos para mostrar.</p>
      ) : (
        <>
          <div className="grilla-datos grilla-datos-parte">
            <Dato etiqueta="Miembro desde" valor={fecha(parte.miembro_desde)} />
            <Dato etiqueta="Ventas completadas" valor={String(parte.completed_sales ?? 0)} />
            <Dato etiqueta="Compras completadas" valor={String(parte.completed_buys ?? 0)} />
            <Dato etiqueta="Baja solicitada" valor={siNo(parte.baja_solicitada)} />
          </div>
          <div className={`estado-cuenta ${vigente ? (parte.sancion_vigente?.tipo === 'bloqueo_definitivo' ? 'bloqueada' : 'suspendida') : 'activa'}`}>
            <span>Sanción vigente</span>
            <strong>{textoSancionVigente(parte)}</strong>
          </div>

          <details className="desplegable">
            <summary>Penalizaciones ({parte.penalizaciones.length})</summary>
            <HistorialPenalizaciones penalizaciones={parte.penalizaciones} nombres={nombres} />
          </details>

          <details className="desplegable">
            <summary>Casos previos ({parte.casos_previos_total})</summary>
            {parte.casos_previos.length === 0 ? (
              <p className="ayuda">No tiene otros casos.</p>
            ) : (
              <ul className="lista-simple">
                {parte.casos_previos.map((previo) => (
                  <li key={previo.caso_id}>
                    <strong>{textoEstado(previo.estado)}</strong> · {textoCategoria(previo.categoria)} · como {previo.rol} · {fecha(previo.created_at)}
                  </li>
                ))}
              </ul>
            )}
            {parte.casos_previos_total > parte.casos_previos.length && (
              <p className="ayuda">Mostramos los {parte.casos_previos.length} más recientes de {parte.casos_previos_total}.</p>
            )}
          </details>

          <p><Link href={`/usuarios/${parte.user_id}`}>Abrir la ficha de usuario</Link></p>
          <RevelarContacto userId={parte.user_id} compacto />
        </>
      )}
    </article>
  );
}

const TITULO_EVENTO: Record<EventoCaso['tipo'], string> = {
  nota_interna: 'Nota interna',
  respuesta_usuario: 'Respuesta al reportante',
  cambio_estado: 'Cambio de estado',
  clasificacion: 'Clasificación',
  sancion_vinculada: 'Sanción vinculada',
  asignacion: 'Asignación',
};

function texto(valor: unknown) {
  return typeof valor === 'string' ? valor : null;
}

function detalleEvento(evento: EventoCaso, nombres: Record<string, string>) {
  const datos = evento.datos ?? {};
  switch (evento.tipo) {
    case 'cambio_estado':
      return `${textoEstado(texto(datos.de))} → ${textoEstado(texto(datos.a))}${datos.cierre ? ' (cierre del caso)' : ''}`;
    case 'clasificacion':
      return `${textoCategoria(texto(datos.de))} → ${textoCategoria(texto(datos.a))}`;
    case 'asignacion': {
      const a = texto(datos.a);
      return `Quedó a cargo de ${a ? (nombres[a] ?? 'otra persona') : 'nadie'}${datos.reasignado ? ' (reasignado)' : ''}`;
    }
    case 'sancion_vinculada': {
      const tipo = texto(datos.tipo);
      const nombreTipo = tipo === 'advertencia' ? 'Advertencia' : tipo === 'bloqueo_definitivo' ? 'Bloqueo definitivo' : `Suspensión (${textoEscalon(texto(datos.escalon))})`;
      return `${nombreTipo} a ${datos.rol === 'reportado' ? 'la persona reportada' : 'quien reportó'}`;
    }
    default:
      return null;
  }
}

export function EventosCaso({ eventos, nombres }: { eventos: EventoCaso[]; nombres: Record<string, string> }) {
  return (
    <section className="bloque" aria-labelledby="eventos-caso">
      <h2 id="eventos-caso">Historial del caso</h2>
      {eventos.length === 0 ? (
        <p className="ayuda">Todavía no hay movimientos.</p>
      ) : (
        <ol className="lista-eventos">
          {eventos.map((evento) => {
            const detalle = detalleEvento(evento, nombres);
            return (
              <li key={evento.id} className={`evento ${evento.tipo}`}>
                <div className="evento-cabecera">
                  <strong>{TITULO_EVENTO[evento.tipo] ?? evento.tipo}</strong>
                  <span className="ayuda">{fecha(evento.created_at)} · {evento.actor_id ? (nombres[evento.actor_id] ?? 'Ex integrante del equipo') : 'Sistema'}</span>
                </div>
                {detalle && <p>{detalle}</p>}
                {evento.texto && <p className="texto-libre">{evento.texto}</p>}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
