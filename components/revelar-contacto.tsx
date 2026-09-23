'use client';

import { useEffect, useState, useTransition } from 'react';
import { revelarContactoUsuario } from '@/lib/acciones/usuarios';
import { AVISO_MOTIVO, mensajeDeError } from '@/lib/errores';

const SEGUNDOS_VISIBLE = 60;

/**
 * El contacto sólo se ve acá, con un motivo obligatorio. Cada clic en «Revelar» es una llamada a la RPC y una fila
 * en el log. El valor vive únicamente en el estado de este componente: no se guarda en ningún otro lado, se oculta
 * solo a los 60 segundos y se pierde al salir de la pantalla.
 */
export function RevelarContacto({ userId }: { userId: string }) {
  const [pidiendo, setPidiendo] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [contacto, setContacto] = useState<{ email: string | null; telefono: string | null } | null>(null);
  const [pendiente, iniciar] = useTransition();

  useEffect(() => {
    if (!contacto) return;
    const temporizador = setTimeout(() => setContacto(null), SEGUNDOS_VISIBLE * 1000);
    return () => clearTimeout(temporizador);
  }, [contacto]);

  const ocultar = () => { setContacto(null); setMotivo(''); setPidiendo(false); setError(''); };

  return (
    <section className="bloque" aria-labelledby="contacto-usuario">
      <h2 id="contacto-usuario">Contacto</h2>
      {contacto ? (
        <div role="status">
          <div className="grilla-datos">
            <div className="dato mono"><span>Mail</span><strong>{contacto.email ?? '—'}</strong></div>
            <div className="dato mono"><span>Teléfono</span><strong>{contacto.telefono ?? '—'}</strong></div>
          </div>
          <p className="ayuda">Se oculta solo en {SEGUNDOS_VISIBLE} segundos. Volver a verlo pide un motivo nuevo y queda registrado otra vez.</p>
          <button className="secundario" onClick={ocultar}>Ocultar contacto</button>
        </div>
      ) : pidiendo ? (
        <div>
          <label>
            Motivo para ver el contacto (obligatorio)
            <textarea value={motivo} onChange={(evento) => setMotivo(evento.target.value)} maxLength={500} required aria-required="true" aria-describedby="aviso-contacto" autoComplete="off" />
          </label>
          <p id="aviso-contacto" className="ayuda">{AVISO_MOTIVO}</p>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="botonera">
            <button
              disabled={pendiente || motivo.trim() === ''}
              onClick={() => iniciar(async () => {
                setError('');
                try {
                  const respuesta = await revelarContactoUsuario(userId, motivo);
                  if (respuesta.ok) { setContacto({ email: respuesta.email, telefono: respuesta.telefono }); setMotivo(''); setPidiendo(false); return; }
                  setError(mensajeDeError(respuesta.codigo));
                } catch {
                  setError(mensajeDeError('FORBIDDEN'));
                }
              })}
            >
              {pendiente ? 'Consultando…' : 'Revelar contacto'}
            </button>
            <button className="secundario" disabled={pendiente} onClick={ocultar}>Cancelar</button>
          </div>
        </div>
      ) : (
        <>
          <p className="ayuda">El mail y el teléfono están ocultos. Verlos queda registrado en el log de auditoría, con tu motivo.</p>
          <button className="secundario" onClick={() => setPidiendo(true)}>Ver contacto</button>
        </>
      )}
    </section>
  );
}
