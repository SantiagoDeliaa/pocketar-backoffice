'use client';

import { useState } from 'react';
import { DialogoAccion } from '@/components/dialogo-accion';
import { rehabilitarPenalizacion } from '@/lib/acciones/usuarios';
import { fecha } from '@/lib/formato';
import { textoEscalon, type Penalizacion } from '@/lib/tipos/usuarios';

const ESTADOS: Record<Penalizacion['estado'], string> = {
  aplicada: 'Aplicada',
  vigente: 'Vigente',
  vencida: 'Vencida',
  levantada: 'Levantada',
};

function titulo(fila: Penalizacion) {
  if (fila.tipo === 'advertencia') return 'Advertencia';
  if (fila.tipo === 'bloqueo_definitivo') return 'Bloqueo definitivo';
  return `Suspensión · ${textoEscalon(fila.escalon)}`;
}

function quien(id: string | null, nombres: Record<string, string>) {
  if (!id) return '—';
  return nombres[id] ?? 'Ex integrante del equipo';
}

function textoEfectos(fila: Penalizacion) {
  const efectos = fila.efectos;
  if (fila.tipo === 'advertencia' || !efectos) return null;
  const partes: string[] = [];
  if (efectos.publicaciones_canceladas) partes.push(`${efectos.publicaciones_canceladas} publicaciones canceladas`);
  if (efectos.ofertas_rechazadas) partes.push(`${efectos.ofertas_rechazadas} ofertas rechazadas`);
  if (efectos.operaciones_dadas_de_baja) partes.push(`${efectos.operaciones_dadas_de_baja} operaciones dadas de baja`);
  if (efectos.contrapartes_avisadas) partes.push(`${efectos.contrapartes_avisadas} contrapartes avisadas`);
  if (efectos.creditos_a_contraparte) partes.push(`${efectos.creditos_a_contraparte} créditos a la contraparte`);
  return partes.length > 0 ? partes.join(' · ') : 'Sin publicaciones, ofertas ni operaciones afectadas';
}

function FilaPenalizacion({ fila, nombres }: { fila: Penalizacion; nombres: Record<string, string> }) {
  const [abierto, setAbierto] = useState(false);
  const efectos = textoEfectos(fila);

  return (
    <li className={`penalizacion ${fila.estado}`}>
      <div className="penalizacion-cabecera">
        <strong>{titulo(fila)}</strong>
        <span className="etiqueta">{ESTADOS[fila.estado]}</span>
      </div>
      <div className="grilla-datos">
        <div className="dato"><span>Aplicada</span><strong>{fecha(fila.aplicada_at)}</strong></div>
        <div className="dato"><span>Por</span><strong>{quien(fila.aplicada_por, nombres)}</strong></div>
        {fila.tipo === 'suspension' && <div className="dato"><span>Vence</span><strong>{fecha(fila.vence_at)}</strong></div>}
        {fila.tipo === 'bloqueo_definitivo' && <div className="dato"><span>Vence</span><strong>No vence</strong></div>}
      </div>
      <div className="dato"><span>Motivo interno</span><strong>{fila.motivo}</strong></div>
      {efectos && <div className="dato"><span>Efectos</span><strong>{efectos}</strong></div>}
      {fila.levantada_at && (
        <div className="dato">
          <span>Levantada</span>
          <strong>{fecha(fila.levantada_at)} · {quien(fila.levantada_por, nombres)}{fila.levantada_motivo ? ` · ${fila.levantada_motivo}` : ''}</strong>
        </div>
      )}
      {fila.estado === 'vigente' && (
        <button className="secundario" onClick={() => setAbierto(true)}>Rehabilitar</button>
      )}
      {abierto && (
        <DialogoAccion
          titulo="Rehabilitar la cuenta"
          etiquetaConfirmar="Rehabilitar"
          etiquetaPendiente="Rehabilitando…"
          cerrar={() => setAbierto(false)}
          ejecutar={(clave, motivo) => rehabilitarPenalizacion(fila.id, motivo, clave)}
        >
          <p className="advertencia">
            Se levanta «{titulo(fila)}» y, si no queda otra sanción vigente, la cuenta puede volver a iniciar sesión.
            No se restituye nada de lo que se canceló al aplicarla.
          </p>
        </DialogoAccion>
      )}
    </li>
  );
}

export function HistorialPenalizaciones({ penalizaciones, nombres }: { penalizaciones: Penalizacion[]; nombres: Record<string, string> }) {
  if (penalizaciones.length === 0) {
    return <p className="ayuda">Esta cuenta no tiene advertencias ni sanciones anteriores.</p>;
  }
  return (
    <ul className="lista-penalizaciones">
      {penalizaciones.map((fila) => <FilaPenalizacion key={fila.id} fila={fila} nombres={nombres} />)}
    </ul>
  );
}
