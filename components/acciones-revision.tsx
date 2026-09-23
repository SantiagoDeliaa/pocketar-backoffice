'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { aprobarPublicacion, rechazarPublicacion } from '@/lib/acciones/revision';
import type { MotivoRechazo } from '@/lib/tipos/revision';
import { mensajeDeError } from '@/lib/errores';

function mensajeError(codigo: string) {
  if (codigo === 'STALE_REVISION') return 'Esta publicación cambió mientras la revisabas. Recargamos los datos; revisala de nuevo antes de decidir.';
  if (codigo === 'ASSIGNED_TO_OTHER') return 'Otra persona tiene esta publicación asignada en este momento.';
  if (codigo === 'DETAIL_REQUIRED') return mensajeDeError(codigo);
  return 'No pudimos completar la operación. No se aplicó ningún cambio.';
}

export function AccionesRevision({ id, intentosRevision, motivos, motivosDisponibles, onRevisionDesactualizada }: { id: string; intentosRevision: number; motivos: MotivoRechazo[]; motivosDisponibles: boolean; onRevisionDesactualizada: () => Promise<void> }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [panel, setPanel] = useState<'aprobar' | 'rechazar' | null>(null);
  const [motivo, setMotivo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [error, setError] = useState('');
  const motivoElegido = motivos.find((fila) => fila.codigo === motivo);
  const claveAprobar = useRef<string | null>(null);
  const claveRechazar = useRef<string | null>(null);

  const resolver = async (resultado: Awaited<ReturnType<typeof aprobarPublicacion>>) => {
    if (resultado.ok) { router.push('/revision'); return; }
    if (resultado.codigo !== 'STALE_REVISION') {
      setError(mensajeError(resultado.codigo));
      return;
    }
    setPanel(null);
    setMotivo('');
    setDetalle('');
    setError('');
    claveAprobar.current = null;
    claveRechazar.current = null;
    await onRevisionDesactualizada();
  };

  return <section className="acciones" aria-labelledby="decidir-publicacion">
    <div><p className="sobrelinea">Decisión</p><h2 id="decidir-publicacion">Resolver publicación</h2></div>
    {error && <p className="error" role="alert">{error}</p>}
    {panel === null && <div className="acciones-iniciales"><button onClick={() => setPanel('aprobar')}>Aprobar publicación</button><button className="peligro" onClick={() => setPanel('rechazar')}>Rechazar publicación</button></div>}
    {panel === 'aprobar' && <div className="confirmacion"><p>Al aprobarla, quedará visible y comenzará su temporizador.</p><div><button disabled={pendiente} onClick={() => iniciar(async () => { claveAprobar.current ??= crypto.randomUUID(); await resolver(await aprobarPublicacion(id, intentosRevision, claveAprobar.current)); })}>{pendiente ? 'Aprobando…' : 'Confirmar aprobación'}</button><button className="secundario" onClick={() => setPanel(null)}>Volver</button></div></div>}
    {panel === 'rechazar' && <div className="confirmacion"><p className="advertencia">El motivo y el detalle los lee el vendedor. No escribas notas internas.</p>{!motivosDisponibles && <p className="error" role="alert">No se pudo cargar el catálogo de motivos. El rechazo queda deshabilitado para no enviar un código inválido.</p>}<label>Motivo<select value={motivo} onChange={(evento) => setMotivo(evento.target.value)} disabled={!motivosDisponibles}><option value="">Elegí un motivo</option>{motivos.map((fila) => <option key={fila.codigo} value={fila.codigo}>{fila.texto_usuario}</option>)}</select></label>{motivoElegido && <p className="ayuda">El vendedor va a ver este motivo: «{motivoElegido.texto_usuario}». Explicale abajo qué tiene que corregir.</p>}<label>Detalle para el vendedor (obligatorio)<textarea value={detalle} onChange={(evento) => setDetalle(evento.target.value)} maxLength={1000} required aria-required="true" placeholder="Explicá con claridad qué tiene que corregir" /></label><div><button className="peligro" disabled={pendiente || !motivo || !detalle.trim() || !motivosDisponibles} onClick={() => iniciar(async () => { claveRechazar.current ??= crypto.randomUUID(); await resolver(await rechazarPublicacion(id, intentosRevision, motivo, detalle, claveRechazar.current)); })}>{pendiente ? 'Rechazando…' : 'Confirmar rechazo'}</button><button className="secundario" onClick={() => setPanel(null)}>Volver</button></div></div>}
  </section>;
}
