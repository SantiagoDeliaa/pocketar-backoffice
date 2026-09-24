'use client';

import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { reenviarAvisoSuspension } from '@/lib/acciones/usuarios';
import { AVISO_MOTIVO, mensajeDeError } from '@/lib/errores';
import { fecha } from '@/lib/formato';
import type { ResultadoAccionUsuario } from '@/lib/tipos/usuarios';

type Props = {
  titulo: string;
  etiquetaConfirmar: string;
  etiquetaPendiente: string;
  cerrar: () => void;
  /** Recibe la clave de idempotencia de ESTE intento y el motivo. Las acciones sin clave la ignoran. */
  ejecutar: (clave: string, motivo: string) => Promise<ResultadoAccionUsuario>;
  peligro?: boolean;
  /** Fricción real (§5.5): el botón sólo se habilita si se escribe exactamente este texto. */
  textoConfirmacion?: string;
  etiquetaTextoConfirmacion?: string;
  /** Validez de los campos propios de cada acción. */
  valido?: boolean;
  /** Para ofrecer el reintento del aviso al suspendido si el envío falla. */
  userId?: string;
  children?: ReactNode;
};

const ETIQUETAS_EFECTOS: [keyof NonNullable<Extract<ResultadoAccionUsuario, { ok: true }>['efectos']>, string][] = [
  ['publicaciones_canceladas', 'Publicaciones canceladas'],
  ['ofertas_rechazadas', 'Ofertas rechazadas'],
  ['operaciones_dadas_de_baja', 'Operaciones dadas de baja'],
  ['contrapartes_avisadas', 'Contrapartes avisadas'],
  ['creditos_a_contraparte', 'Créditos a la contraparte'],
];

export function DialogoAccion({
  titulo,
  etiquetaConfirmar,
  etiquetaPendiente,
  cerrar,
  ejecutar,
  peligro = false,
  textoConfirmacion,
  etiquetaTextoConfirmacion,
  valido = true,
  userId,
  children,
}: Props) {
  const router = useRouter();
  const dialogo = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  // Una clave por intento del moderador: se genera al abrir el diálogo y se reutiliza en el reintento o el doble
  // clic. Un diálogo nuevo es un intento nuevo. Nunca se genera una clave por clic.
  const [clave] = useState(() => crypto.randomUUID());
  const [motivo, setMotivo] = useState('');
  const [escrito, setEscrito] = useState('');
  const [resultado, setResultado] = useState<ResultadoAccionUsuario | null>(null);
  const [reintento, setReintento] = useState<'' | 'enviando' | 'ok' | 'error'>('');
  const [pendiente, iniciar] = useTransition();

  useEffect(() => {
    const elemento = dialogo.current;
    if (elemento && !elemento.open) elemento.showModal();
  }, []);

  const terminado = resultado?.ok === true;
  const habilitado =
    valido &&
    motivo.trim() !== '' &&
    (!textoConfirmacion || escrito.trim() === textoConfirmacion) &&
    !pendiente &&
    !terminado;

  const confirmar = () =>
    iniciar(async () => {
      try {
        const respuesta = await ejecutar(clave, motivo);
        setResultado(respuesta);
        if (respuesta.ok) router.refresh();
      } catch {
        setResultado({ ok: false, codigo: 'FORBIDDEN' });
      }
    });

  const cerrarDialogo = () => dialogo.current?.close();

  return (
    <dialog
      ref={dialogo}
      className="dialogo"
      aria-labelledby={idTitulo}
      onCancel={(evento) => { if (pendiente) evento.preventDefault(); }}
      onClose={cerrar}
    >
      <div className="dialogo-cuerpo">
        <h2 id={idTitulo}>{titulo}</h2>

        {!terminado && (
          <>
            {children}
            <label>
              Motivo (obligatorio)
              <textarea
                value={motivo}
                onChange={(evento) => setMotivo(evento.target.value)}
                maxLength={1000}
                required
                aria-required="true"
                aria-describedby={`${idTitulo}-aviso`}
                autoComplete="off"
              />
            </label>
            <p id={`${idTitulo}-aviso`} className="ayuda">{AVISO_MOTIVO}</p>
            {textoConfirmacion && (
              <label>
                {etiquetaTextoConfirmacion ?? 'Para confirmar, escribí'} «{textoConfirmacion}»
                <input
                  value={escrito}
                  onChange={(evento) => setEscrito(evento.target.value)}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
              </label>
            )}
          </>
        )}

        {resultado && !resultado.ok && (
          <div className="error" role="alert">
            <p>{mensajeDeError(resultado.codigo, resultado.campo)}</p>
            {resultado.codigo === 'PENDING_SELLER_DECISION' && (
              <>
                {resultado.publicaciones && resultado.publicaciones.length > 0 && (
                  <>
                    <p>Publicaciones que lo impiden:</p>
                    <ul>
                      {resultado.publicaciones.map((publicacion) => (
                        <li key={publicacion.id}>{publicacion.titulo} <span className="mono">({publicacion.id})</span></li>
                      ))}
                    </ul>
                  </>
                )}
                <p>
                  Se destraba solo cuando el vendedor decide o vence su plazo de 48 h. No hace falta reintentar
                  ahora: volvé a probar más tarde.
                </p>
              </>
            )}
          </div>
        )}

        {resultado?.ok && (
          <div className="exito" role="status">
            <p><strong>{resultado.replayed ? 'Esto ya estaba aplicado.' : 'Listo, se aplicó.'}</strong></p>
            {resultado.replayed && <p>Fue un reintento de la misma operación: no se repitió nada.</p>}
            {resultado.vinculadaACaso && <p>Quedó vinculada al caso.</p>}
            {resultado.vence_at && <p>Vence: {fecha(resultado.vence_at)}</p>}
            {resultado.vence_at === null && resultado.efectos && <p>No vence solo: se levanta con «Rehabilitar».</p>}
            {resultado.campos && resultado.campos.length > 0 && <p>Campos corregidos: {resultado.campos.length}.</p>}
            {resultado.efectos && (
              <dl className="efectos">
                {ETIQUETAS_EFECTOS.map(([campo, etiqueta]) => (
                  <div key={campo}><dt>{etiqueta}</dt><dd className="mono">{resultado.efectos?.[campo] ?? 0}</dd></div>
                ))}
              </dl>
            )}
            {resultado.bannedUntil && <p>La cuenta sigue bloqueada porque queda otra sanción vigente.</p>}
            {resultado.avisos.fallidos > 0 && (
              <div className="aviso" role="alert">
                <p>
                  {resultado.avisos.fallidos === 1 ? 'Un aviso no salió' : `${resultado.avisos.fallidos} avisos no salieron`}{' '}
                  (mail o push). La operación se aplicó igual; no se revirtió nada.
                </p>
                {resultado.avisos.falloAvisoSuspendido && userId && reintento !== 'ok' && (
                  <button
                    className="secundario"
                    disabled={reintento === 'enviando'}
                    onClick={async () => {
                      setReintento('enviando');
                      try {
                        const respuesta = await reenviarAvisoSuspension(userId);
                        setReintento(respuesta.ok ? 'ok' : 'error');
                      } catch {
                        setReintento('error');
                      }
                    }}
                  >
                    {reintento === 'enviando' ? 'Reenviando…' : 'Reintentar aviso al suspendido'}
                  </button>
                )}
                {reintento === 'ok' && <p>El aviso al suspendido salió.</p>}
                {reintento === 'error' && <p role="alert">El reintento tampoco salió. Probá de nuevo más tarde.</p>}
              </div>
            )}
          </div>
        )}

        <div className="botonera">
          {!terminado && (
            <button className={peligro ? 'peligro' : undefined} disabled={!habilitado} onClick={confirmar}>
              {pendiente ? etiquetaPendiente : etiquetaConfirmar}
            </button>
          )}
          <button className="secundario" disabled={pendiente} onClick={cerrarDialogo}>
            {terminado ? 'Cerrar' : 'Cancelar'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
