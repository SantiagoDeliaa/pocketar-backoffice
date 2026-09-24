'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { tomarCaso } from '@/lib/acciones/reportes';
import { mensajeDeError } from '@/lib/errores';

/**
 * Aviso de que el caso lo tiene otra persona. Tomarlo es una decisión explícita, con confirmación: nunca se toma solo.
 * La asignación no vence, así que quitárselo a alguien es una decisión del equipo, no un accidente.
 */
export function TomarCaso({ casoId, nombreActual }: { casoId: string; nombreActual: string }) {
  const router = useRouter();
  const dialogo = useRef<HTMLDialogElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState('');
  const [pendiente, iniciar] = useTransition();

  useEffect(() => {
    const elemento = dialogo.current;
    if (abierto && elemento && !elemento.open) elemento.showModal();
  }, [abierto]);

  const confirmar = () =>
    iniciar(async () => {
      setError('');
      try {
        const respuesta = await tomarCaso(casoId, true);
        if (respuesta.ok) {
          dialogo.current?.close();
          router.refresh();
          return;
        }
        setError(mensajeDeError(respuesta.codigo));
      } catch {
        setError(mensajeDeError('FORBIDDEN'));
      }
    });

  return (
    <div className="aviso" role="status">
      <p><strong>Este caso lo tiene {nombreActual}.</strong> Podés mirarlo, pero las acciones que exigen tenerlo tomado te van a dar error hasta que lo tomes.</p>
      <button className="secundario" onClick={() => setAbierto(true)}>Tomar este caso…</button>
      {abierto && (
        <dialog
          ref={dialogo}
          className="dialogo"
          aria-labelledby="tomar-caso-titulo"
          onCancel={(evento) => { if (pendiente) evento.preventDefault(); }}
          onClose={() => { setAbierto(false); setError(''); }}
        >
          <div className="dialogo-cuerpo">
            <h2 id="tomar-caso-titulo">Tomar el caso de {nombreActual}</h2>
            <p className="advertencia">
              Se lo vas a sacar a {nombreActual} y pasa a ser tuyo. La asignación no vence sola, así que hacelo sólo si es un acuerdo del equipo.
            </p>
            {error && <p className="error" role="alert">{error}</p>}
            <div className="botonera">
              <button disabled={pendiente} onClick={confirmar}>{pendiente ? 'Tomando…' : 'Sí, tomarlo yo'}</button>
              <button className="secundario" disabled={pendiente} onClick={() => dialogo.current?.close()}>Cancelar</button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
