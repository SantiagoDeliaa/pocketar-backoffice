'use client';

import { useCallback, useEffect, useState } from 'react';
import { abrirPublicacionRevision, cargarComplementoRevision } from '@/lib/acciones/revision';
import { AccionesRevision } from '@/components/acciones-revision';
import type { MotivoRechazo } from '@/lib/tipos/revision';
import { fecha, moneda, tiempoSla } from '@/lib/formato';

type Datos = {
  auction?: { id: string; en_cola_desde: string; intentos_revision: number; currency: string | null; opening_price: number | null; current_price: number | null; min_increment: number | null; buy_now_price: number | null; provincia: string | null; condicion: string | null; images: string[] | null; description: string | null; is_lot: boolean | null; duracion_horas: number | null };
  item?: { id: string; title: string; game: string | null; attributes: Record<string, unknown> | null; valuation_variant_id: string | null };
  seller?: { alias: string; created_at: string; completed_sales: number | null; completed_buys: number | null; localidad_provincia: string | null };
  asignada_hasta?: string;
};

export function DetalleRevision({ id, motivos, motivosDisponibles }: { id: string; motivos: MotivoRechazo[]; motivosDisponibles: boolean }) {
  const [estado, setEstado] = useState<{ cargando: boolean; error: string; datos: Datos | null }>({ cargando: true, error: '', datos: null });
  const [imagen, setImagen] = useState<string | null>(null);
  const [publicacionesTotales, setPublicacionesTotales] = useState<number | null>(null);
  const [aviso, setAviso] = useState('');

  const cargarRevision = useCallback(async (porDesactualizacion: boolean) => {
    const resultado = await abrirPublicacionRevision(id);
    if (!resultado.ok) {
      setEstado({ cargando: false, datos: null, error: resultado.codigo === 'ASSIGNED_TO_OTHER' ? 'Otra persona está revisando esta publicación.' : resultado.codigo === 'AUCTION_NOT_IN_REVIEW' ? 'Esta publicación ya no está en revisión.' : 'No pudimos abrir esta publicación para revisión.' });
      setAviso('');
      return;
    }
    setEstado({ cargando: false, datos: resultado.datos as Datos, error: '' });
    setAviso(porDesactualizacion ? 'La publicación cambió mientras la revisabas. Cargamos la versión nueva; revisala antes de decidir.' : '');
    cargarComplementoRevision(id).then((complemento) => setPublicacionesTotales(complemento?.publicacionesTotales ?? null)).catch(() => setPublicacionesTotales(null));
  }, [id]);

  useEffect(() => { void cargarRevision(false); }, [cargarRevision]);

  if (estado.cargando) return <main className="contenedor"><p className="cargando">Tomando la asignación de revisión…</p></main>;
  if (!estado.datos?.auction || !estado.datos.item || !estado.datos.seller) return <main className="contenedor"><div className="vacio"><h1>Esta publicación no está disponible</h1><p>{estado.error}</p></div></main>;

  const { auction: publicacion, item, seller } = estado.datos;
  const sla = tiempoSla(publicacion.en_cola_desde);
  const datosCrudos = {
    'ID de publicación': publicacion.id,
    'ID de ítem': item.id,
    'Vínculo de catálogo': item.valuation_variant_id ?? 'No corresponde',
    Tipo: publicacion.is_lot ? 'Lote' : 'Publicación',
    'Intento de revisión': String(publicacion.intentos_revision),
    'Asignada hasta': fecha(estado.datos.asignada_hasta ?? null),
    'Atributos guardados': item.attributes ? JSON.stringify(item.attributes) : 'Sin atributos adicionales',
  };

  return <main className="contenedor detalle">
    <header className="encabezado-detalle"><div><p className="sobrelinea">Revisión de publicación</p><h1>{item.title}</h1><p>{item.game ?? 'TCG sin informar'} · {publicacion.is_lot ? 'Lote' : 'Publicación'}</p></div><div className={`contador ${sla.estado}`}><span>SLA de revisión</span><strong>{sla.texto}</strong></div></header>
    {aviso && <p className="aviso" role="status">{aviso}</p>}
    <div className="zona-trabajo">
      <section className="bloque"><h2>Preview de la publicación</h2><div className="galeria">{(publicacion.images ?? []).slice(0, 10).map((url, indice) => <button key={url} className="miniatura" onClick={() => setImagen(url)} aria-label={`Ver foto ${indice + 1}`}><img src={url} alt={`Foto ${indice + 1} de la publicación`} /></button>)}{(publicacion.images ?? []).length === 0 && <p className="ayuda">No hay fotos cargadas.</p>}</div><div className="grilla-datos"><Dato etiqueta="Descripción" valor={publicacion.description ?? '—'} /><Dato etiqueta="Condición" valor={publicacion.condicion ?? 'No corresponde'} /><Dato etiqueta="Precio de apertura" valor={moneda(publicacion.opening_price, publicacion.currency)} mono /><Dato etiqueta="Precio actual" valor={moneda(publicacion.current_price, publicacion.currency)} mono /><Dato etiqueta="Incremento mínimo" valor={moneda(publicacion.min_increment, publicacion.currency)} mono />{publicacion.buy_now_price !== null && <Dato etiqueta="Comprar ahora" valor={moneda(publicacion.buy_now_price, publicacion.currency)} mono />}<Dato etiqueta="Moneda" valor={publicacion.currency ?? '—'} /><Dato etiqueta="Provincia" valor={publicacion.provincia ?? '—'} /><Dato etiqueta="Duración" valor={publicacion.duracion_horas ? `${publicacion.duracion_horas} h` : '—'} /></div></section>
      <section className="bloque"><h2>Datos crudos del formulario</h2><div className="grilla-datos">{Object.entries(datosCrudos).map(([etiqueta, valor]) => <Dato key={etiqueta} etiqueta={etiqueta} valor={valor} mono={etiqueta.includes('ID') || etiqueta === 'Vínculo de catálogo'} />)}</div></section>
      <section className="bloque"><h2>Ficha del vendedor</h2><div className="grilla-datos"><Dato etiqueta="Alias" valor={seller.alias} /><Dato etiqueta="En Pocketar desde" valor={fecha(seller.created_at)} /><Dato etiqueta="Provincia" valor={seller.localidad_provincia ?? 'No informada'} /><Dato etiqueta="Ventas completadas" valor={String(seller.completed_sales ?? 0)} mono /><Dato etiqueta="Compras completadas" valor={String(seller.completed_buys ?? 0)} mono /><Dato etiqueta="Publicaciones totales" valor={publicacionesTotales === null ? 'No disponible' : String(publicacionesTotales)} mono /></div><p className="ayuda">No hay señales de riesgo adicionales disponibles en el contrato actual.</p></section>
    </div>
    <AccionesRevision id={publicacion.id} intentosRevision={publicacion.intentos_revision} motivos={motivos} motivosDisponibles={motivosDisponibles} onRevisionDesactualizada={() => cargarRevision(true)} />
    {imagen && <div className="lightbox" role="dialog" aria-modal="true" aria-label="Foto ampliada" onClick={() => setImagen(null)}><img src={imagen} alt="Foto ampliada de la publicación" /></div>}
  </main>;
}

function Dato({ etiqueta, valor, mono = false }: { etiqueta: string; valor: string; mono?: boolean }) {
  return <div className={mono ? 'dato mono' : 'dato'}><span>{etiqueta}</span><strong>{valor}</strong></div>;
}
