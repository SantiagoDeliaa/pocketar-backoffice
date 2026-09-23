'use client';

import { useMemo, useState } from 'react';
import { DespublicarPublicacion } from '@/components/despublicar-publicacion';
import type { FilaRevision } from '@/lib/datos/revision';
import { fecha, moneda } from '@/lib/formato';

export function ListaPublicaciones({ filas }: { filas: FilaRevision[] }) {
  const [busqueda, setBusqueda] = useState('');
  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return filas;
    return filas.filter((fila) => `${fila.item?.title ?? ''} ${fila.vendedor?.alias ?? ''} ${fila.item?.game ?? ''}`.toLowerCase().includes(termino));
  }, [busqueda, filas]);

  return <>
    <input className="busqueda" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar por título, alias o TCG" aria-label="Buscar publicaciones activas" />
    {visibles.length === 0 ? <div className="vacio"><h2>{filas.length === 0 ? 'No hay publicaciones activas' : 'No hay coincidencias'}</h2><p>{filas.length === 0 ? 'Cuando una publicación aprobada esté visible, va a aparecer acá.' : 'Probá con otro título, alias o TCG.'}</p></div> : <div className="lista-abiertas">{visibles.map((fila) => <article key={fila.id} className="publicacion-abierta"><div><h2>{fila.item?.title ?? 'Ítem sin título'}</h2><p>{fila.vendedor?.alias ?? 'Sin alias'} · {fila.item?.game ?? 'TCG sin informar'} · publicada {fecha(fila.starts_at)}</p></div><strong className="mono">{moneda(fila.current_price, fila.currency)}</strong><DespublicarPublicacion id={fila.id} titulo={fila.item?.title ?? ''} permiteCooldown={Boolean(fila.item?.valuation_variant_id)} /></article>)}</div>}
  </>;
}
