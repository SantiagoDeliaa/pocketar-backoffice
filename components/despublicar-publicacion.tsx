'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { despublicarPublicacion } from '@/lib/acciones/revision';

export function DespublicarPublicacion({ id, titulo, permiteCooldown }: { id: string; titulo: string; permiteCooldown: boolean }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [confirmacion, setConfirmacion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [motivoInterno, setMotivoInterno] = useState('');
  const [cooldown, setCooldown] = useState(false);
  const [error, setError] = useState('');
  const [pendiente, iniciar] = useTransition();
  const clave = useRef<string | null>(null);

  if (!abierto) return <button className="peligro" onClick={() => setAbierto(true)}>Dar de baja</button>;
  const coincide = confirmacion.trim() === titulo;
  return <div className="panel-baja"><h2>Dar de baja esta publicación</h2><p className="advertencia">Esta acción rechaza todas las ofertas recibidas. Para continuar, escribí el título exactamente como aparece.</p><label>Título de confirmación<input value={confirmacion} onChange={(evento) => setConfirmacion(evento.target.value)} /></label><label>Mensaje para el vendedor<textarea value={mensaje} onChange={(evento) => setMensaje(evento.target.value)} maxLength={300} required placeholder="Explicá con claridad por qué se da de baja." /></label><label>Motivo interno opcional<textarea value={motivoInterno} onChange={(evento) => setMotivoInterno(evento.target.value)} /></label>{permiteCooldown ? <label className="check"><input type="checkbox" checked={cooldown} onChange={(evento) => setCooldown(evento.target.checked)} /> Aplicar cooldown de dos semanas al vendedor</label> : <p className="ayuda">Este lote no tiene ítem de catálogo, así que no admite cooldown.</p>}{error && <p className="error" role="alert">{error}</p>}<div><button className="peligro" disabled={!coincide || !mensaje.trim() || pendiente} onClick={() => iniciar(async () => { clave.current ??= crypto.randomUUID(); const resultado = await despublicarPublicacion(id, mensaje, cooldown, motivoInterno, clave.current); if (resultado.ok) { router.refresh(); setAbierto(false); return; } setError(resultado.codigo === 'AUCTION_NOT_OPEN' ? 'Esta publicación ya no está abierta. Actualizá el listado antes de continuar.' : 'No pudimos dar de baja la publicación. No se aplicó ningún cambio.'); })}>{pendiente ? 'Dando de baja…' : 'Confirmar baja'}</button><button className="secundario" onClick={() => setAbierto(false)}>Cancelar</button></div></div>;
}
