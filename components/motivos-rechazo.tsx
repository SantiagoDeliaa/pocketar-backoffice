'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { guardarMotivoRechazo } from '@/lib/acciones/motivos';
import { mensajeDeErrorMotivo } from '@/lib/errores';
import { fecha } from '@/lib/formato';
import {
  FORMATO_CODIGO_MOTIVO,
  LIMITE_TEXTO_MOTIVO,
  type MotivoRechazoConfig,
  type ResultadoGuardarMotivo,
} from '@/lib/tipos/motivos';

type Edicion = { tipo: 'nuevo' } | { tipo: 'editar'; motivo: MotivoRechazoConfig };

function AvisoVendedor() {
  return (
    <div className="aviso" role="note">
      <p><strong>Este texto lo lee el vendedor</strong> cuando se le rechaza una publicación.</p>
      <p>
        Tiene que decir qué está mal y qué tiene que hacer para corregirlo. No incluyas datos personales (mail,
        teléfono, nombres, direcciones).
      </p>
    </div>
  );
}

export function ListaMotivos({ motivos }: { motivos: MotivoRechazoConfig[] }) {
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const siguienteOrden = motivos.reduce((maximo, motivo) => Math.max(maximo, motivo.orden), 0) + 1;

  return (
    <>
      <div className="botonera barra-motivos">
        <button onClick={() => setEdicion({ tipo: 'nuevo' })}>Crear motivo</button>
      </div>

      {motivos.length === 0 ? (
        <p className="vacio">Todavía no hay motivos cargados.</p>
      ) : (
        <ul className="lista-motivos">
          {motivos.map((motivo) => (
            <li key={motivo.codigo} className={motivo.activo ? 'motivo' : 'motivo inactivo'}>
              <div className="motivo-cabecera">
                <code>{motivo.codigo}</code>
                <span className={motivo.activo ? 'etiqueta-estado activo' : 'etiqueta-estado'}>
                  {motivo.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <p className="texto-libre">{motivo.texto_usuario}</p>
              <div className="motivo-pie">
                <span>Orden <strong className="mono">{motivo.orden}</strong></span>
                <span>
                  Usado en <strong className="mono">{motivo.usos}</strong> {motivo.usos === 1 ? 'rechazo' : 'rechazos'}
                </span>
                {motivo.updated_at && <span>Editado {fecha(motivo.updated_at)}</span>}
                <button className="secundario" onClick={() => setEdicion({ tipo: 'editar', motivo })}>Editar</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {edicion && (
        <DialogoMotivo
          edicion={edicion}
          siguienteOrden={siguienteOrden}
          cerrar={() => setEdicion(null)}
        />
      )}
    </>
  );
}

function DialogoMotivo({ edicion, siguienteOrden, cerrar }: { edicion: Edicion; siguienteOrden: number; cerrar: () => void }) {
  const router = useRouter();
  const dialogo = useRef<HTMLDialogElement>(null);
  const id = useId();
  const original = edicion.tipo === 'editar' ? edicion.motivo : null;

  const [codigo, setCodigo] = useState(original?.codigo ?? '');
  const [texto, setTexto] = useState(original?.texto_usuario ?? '');
  const [orden, setOrden] = useState(String(original?.orden ?? siguienteOrden));
  const [activo, setActivo] = useState(original?.activo ?? true);
  const [resultado, setResultado] = useState<ResultadoGuardarMotivo | null>(null);
  const [pendiente, iniciar] = useTransition();
  // Una clave por intento: se reutiliza si se reintenta el mismo envío y se descarta al tocar cualquier campo.
  const clave = useRef<string | null>(null);

  useEffect(() => {
    const elemento = dialogo.current;
    if (elemento && !elemento.open) elemento.showModal();
  }, []);

  const tocar = () => {
    clave.current = null;
    setResultado(null);
  };

  const caracteres = [...texto.trim()].length;
  const codigoValido = original !== null || FORMATO_CODIGO_MOTIVO.test(codigo);
  const ordenNumero = orden.trim() === '' ? Number.NaN : Number(orden);
  const ordenValido = Number.isSafeInteger(ordenNumero);
  const textoValido = caracteres > 0 && caracteres <= LIMITE_TEXTO_MOTIVO;
  const terminado = resultado?.ok === true;
  const habilitado = codigoValido && textoValido && ordenValido && !pendiente && !terminado;

  const guardar = () =>
    iniciar(async () => {
      try {
        const intento = (clave.current ??= crypto.randomUUID());
        const respuesta = await guardarMotivoRechazo(codigo, texto, ordenNumero, activo, intento);
        setResultado(respuesta);
        if (respuesta.ok) router.refresh();
      } catch {
        setResultado({ ok: false, codigo: 'FORBIDDEN' });
      }
    });

  return (
    <dialog
      ref={dialogo}
      className="dialogo"
      aria-labelledby={`${id}-titulo`}
      onCancel={(evento) => { if (pendiente) evento.preventDefault(); }}
      onClose={cerrar}
    >
      <form
        className="dialogo-cuerpo"
        onSubmit={(evento) => { evento.preventDefault(); if (habilitado) guardar(); }}
      >
        <h2 id={`${id}-titulo`}>{original ? 'Editar motivo' : 'Crear motivo'}</h2>

        {!terminado && (
          <>
            {original ? (
              <p>Código: <code>{original.codigo}</code> <span className="ayuda">(no se puede cambiar)</span></p>
            ) : (
              <>
                <label>
                  Código
                  <input
                    value={codigo}
                    onChange={(evento) => { tocar(); setCodigo(evento.target.value); }}
                    maxLength={40}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    required
                    aria-describedby={`${id}-codigo`}
                    aria-invalid={codigo !== '' && !codigoValido}
                  />
                </label>
                <p id={`${id}-codigo`} className={codigo !== '' && !codigoValido ? 'ayuda campo-error' : 'ayuda'}>
                  De 3 a 40 caracteres: letras minúsculas sin tildes, números y guion bajo (por ejemplo{' '}
                  <code>fotos_borrosas</code>). Es el identificador del motivo: una vez creado no se puede cambiar ni borrar.
                </p>
              </>
            )}

            <AvisoVendedor />
            <label>
              Texto para el vendedor
              <textarea
                value={texto}
                onChange={(evento) => { tocar(); setTexto(evento.target.value); }}
                required
                aria-describedby={`${id}-contador`}
                aria-invalid={caracteres > LIMITE_TEXTO_MOTIVO}
              />
            </label>
            <p id={`${id}-contador`} className={caracteres > LIMITE_TEXTO_MOTIVO ? 'ayuda campo-error' : 'ayuda'}>
              <span className="mono">{caracteres}/{LIMITE_TEXTO_MOTIVO}</span> caracteres
            </p>

            <label>
              Orden
              <input
                type="number"
                inputMode="numeric"
                step={1}
                value={orden}
                onChange={(evento) => { tocar(); setOrden(evento.target.value); }}
                required
                aria-describedby={`${id}-orden`}
              />
            </label>
            <p id={`${id}-orden`} className="ayuda">Los motivos se muestran de menor a mayor orden.</p>

            <label className="check">
              <input type="checkbox" checked={activo} onChange={(evento) => { tocar(); setActivo(evento.target.checked); }} />
              Activo
            </label>
            <p className="ayuda">
              Un motivo inactivo deja de estar disponible para rechazar publicaciones. Tiene que quedar al menos un motivo activo.
            </p>
            <p className="ayuda">Editar un motivo no cambia los rechazos que ya se hicieron.</p>
          </>
        )}

        {resultado && !resultado.ok && (
          <div className="error" role="alert"><p>{mensajeDeErrorMotivo(resultado.codigo)}</p></div>
        )}
        {resultado?.ok && (
          <div className="exito" role="status">
            <p>
              <strong>
                {resultado.replayed ? 'Esto ya estaba guardado.' : resultado.creado ? 'Listo, el motivo se creó.' : 'Listo, se guardaron los cambios.'}
              </strong>
            </p>
            {resultado.replayed && <p>Fue un reintento de la misma operación: no se repitió nada.</p>}
          </div>
        )}

        <div className="botonera">
          {!terminado && <button type="submit" disabled={!habilitado}>{pendiente ? 'Guardando…' : 'Guardar'}</button>}
          <button type="button" className="secundario" disabled={pendiente} onClick={() => dialogo.current?.close()}>
            {terminado ? 'Cerrar' : 'Cancelar'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
