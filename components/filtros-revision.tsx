'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { FilaRevision } from '@/lib/datos/revision';
import type { MiembroRevision } from '@/lib/tipos/revision';
import { moneda, tiempoSla } from '@/lib/formato';

export function FiltrosRevision({ filas, miembros, staffId }: { filas: FilaRevision[]; miembros: MiembroRevision[]; staffId: string }) {
  const [vendedor, setVendedor] = useState('');
  const [tcg, setTcg] = useState('');
  const [divisa, setDivisa] = useState('');
  const [lote, setLote] = useState('');
  const [reenvios, setReenvios] = useState(false);

  const visibles = useMemo(() => filas.filter((fila) => {
    const textoVendedor = (fila.vendedor?.alias ?? '').toLowerCase();
    return (!vendedor || textoVendedor.includes(vendedor.toLowerCase()))
      && (!tcg || (fila.item?.game ?? '').toLowerCase() === tcg.toLowerCase())
      && (!divisa || fila.currency === divisa)
      && (!lote || String(Boolean(fila.is_lot)) === lote)
      && (!reenvios || fila.intentos_revision > 1);
  }), [divisa, filas, lote, reenvios, tcg, vendedor]);

  const tcgs = [...new Set(filas.map((fila) => fila.item?.game).filter(Boolean))] as string[];
  const divisas = [...new Set(filas.map((fila) => fila.currency).filter(Boolean))] as string[];

  return (
    <>
      <div className="filtros" aria-label="Filtros de la cola">
        <input value={vendedor} onChange={(evento) => setVendedor(evento.target.value)} placeholder="Buscar vendedor" aria-label="Vendedor" />
        <select value={tcg} onChange={(evento) => setTcg(evento.target.value)} aria-label="TCG"><option value="">Todos los TCG</option>{tcgs.map((valor) => <option key={valor} value={valor}>{valor}</option>)}</select>
        <select value={divisa} onChange={(evento) => setDivisa(evento.target.value)} aria-label="Moneda"><option value="">Todas las monedas</option>{divisas.map((valor) => <option key={valor} value={valor}>{valor}</option>)}</select>
        <select value={lote} onChange={(evento) => setLote(evento.target.value)} aria-label="Tipo"><option value="">Publicaciones y lotes</option><option value="false">Publicaciones</option><option value="true">Lotes</option></select>
        <label className="check"><input type="checkbox" checked={reenvios} onChange={(evento) => setReenvios(evento.target.checked)} /> Sólo reenvíos</label>
      </div>
      <p className="resultado">{visibles.length} {visibles.length === 1 ? 'publicación' : 'publicaciones'} para revisar</p>
      {visibles.length === 0 ? <div className="vacio"><h2>{filas.length === 0 ? 'La cola está al día' : 'No hay coincidencias'}</h2><p>{filas.length === 0 ? 'No hay publicaciones esperando revisión en este momento.' : 'Probá quitar o cambiar alguno de los filtros.'}</p></div> : (
        <div className="lista-publicaciones">
          {visibles.map((fila) => {
            const sla = tiempoSla(fila.starts_at ?? fila.created_at);
            return <Link href={`/revision/${fila.id}`} key={fila.id} className={`fila-publicacion ${sla.estado}`}>
              <div className="sla"><span>Vence en</span><strong>{sla.texto}</strong></div>
              <div><strong>{fila.item?.title ?? 'Ítem sin título'}</strong><span>{fila.item?.game ?? 'TCG sin informar'} · {fila.is_lot ? 'Lote' : 'Publicación'}</span></div>
              <div><span>Vendedor</span><strong>{fila.vendedor?.alias ?? 'Sin alias'}</strong></div>
              <div className="mono"><span>Precio inicial</span><strong>{moneda(fila.opening_price, fila.currency)}</strong></div>
              <div><span>Revisión</span><strong>{textoAsignacion(fila, miembros, staffId)}</strong></div>
              {fila.intentos_revision > 1 && <span className="etiqueta">Reenvío {fila.intentos_revision}</span>}
            </Link>;
          })}
        </div>
      )}
    </>
  );
}

function textoAsignacion(fila: FilaRevision, miembros: MiembroRevision[], staffId: string) {
  if (!fila.revisor_asignado_a || !fila.revisor_asignado_at) return 'Disponible';
  const venceEn = new Date(fila.revisor_asignado_at).getTime() + 30 * 60 * 1000;
  if (venceEn <= Date.now()) return 'Disponible';
  if (fila.revisor_asignado_a === staffId) return 'Asignada a vos';
  return `En revisión por ${miembros.find((miembro) => miembro.user_id === fila.revisor_asignado_a)?.nombre ?? 'otra persona'}`;
}
