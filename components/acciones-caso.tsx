'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DialogosSancion, type AccionSancion } from '@/components/dialogos-sancion';
import {
  agregarNotaCaso,
  cambiarEstadoCaso,
  clasificarCaso,
  desestimarCaso,
  responderCaso,
  resolverCaso,
  tomarCaso,
} from '@/lib/acciones/reportes';
import { mensajeDeError } from '@/lib/errores';
import { fecha } from '@/lib/formato';
import {
  CATEGORIAS_CASO,
  ESTADOS_ABIERTOS,
  TEXTO_CATEGORIA,
  TEXTO_ESTADO,
  type CategoriaCaso,
  type EstadoCaso,
} from '@/lib/tipos/reportes';

export type ParteSancionable = { userId: string; alias: string; etiqueta: string };

type Props = {
  casoId: string;
  estado: EstadoCaso;
  categoria: CategoriaCaso | null;
  respondidoAt: string | null;
  partes: ParteSancionable[];
};

const AVISO_RESPUESTA =
  'Este texto lo lee el usuario que reportó. NUNCA puede llevar un dato de contacto de la contraparte (mail, teléfono, redes, dirección), y la plataforma no toma partido ni promete reembolsos. Es un solo mensaje: no hay conversación.';
const AVISO_NOTA =
  'La nota queda en el caso y no se puede borrar. Si escribís un dato personal, queda guardado: conviene no escribirlo.';

type ErrorCaso = { codigo: string } | null;

/** Una clave por intento: se genera al enviar, se reusa si se reintenta y se descarta al editar el texto o al salir bien. */
function useClave() {
  const ref = useRef<string | null>(null);
  return { obtener: () => (ref.current ??= crypto.randomUUID()), reiniciar: () => { ref.current = null; } };
}

function MensajeError({ error, casoId, alTomar }: { error: ErrorCaso; casoId: string; alTomar: () => void }) {
  const [tomando, iniciar] = useTransition();
  const [fallo, setFallo] = useState('');
  if (!error) return null;
  return (
    <div className="error" role="alert">
      <p>{mensajeDeError(error.codigo)}</p>
      {error.codigo === 'NOT_ASSIGNED' && (
        <>
          <button
            className="secundario"
            disabled={tomando}
            onClick={() => iniciar(async () => {
              setFallo('');
              try {
                const respuesta = await tomarCaso(casoId, false);
                if (respuesta.ok) alTomar();
                else setFallo(mensajeDeError(respuesta.codigo));
              } catch {
                setFallo(mensajeDeError('FORBIDDEN'));
              }
            })}
          >
            {tomando ? 'Tomando…' : 'Tomar el caso'}
          </button>
          {fallo && <p>{fallo}</p>}
        </>
      )}
    </div>
  );
}

export function AccionesCaso({ casoId, estado, categoria, respondidoAt, partes }: Props) {
  const router = useRouter();
  const cerrado = estado === 'resuelto' || estado === 'desestimado';

  const [exito, setExito] = useState('');
  const [errores, setErrores] = useState<Record<string, ErrorCaso>>({});
  const [pendiente, iniciar] = useTransition();

  const [categoriaElegida, setCategoriaElegida] = useState<string>(categoria ?? '');
  const [estadoElegido, setEstadoElegido] = useState<string>(ESTADOS_ABIERTOS.includes(estado as never) ? estado : '');
  const [nota, setNota] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [modoCierre, setModoCierre] = useState<'resolver' | 'desestimar' | null>(null);
  const [resolucion, setResolucion] = useState('');
  const [respuestaCierre, setRespuestaCierre] = useState('');
  const [respuestaEnviada, setRespuestaEnviada] = useState(false);
  const [sancion, setSancion] = useState<AccionSancion | null>(null);
  const [parteElegida, setParteElegida] = useState(partes[0]?.userId ?? '');

  const claveCategoria = useClave();
  const claveEstado = useClave();
  const claveNota = useClave();
  const claveRespuesta = useClave();
  const claveCierre = useClave();
  const claveRespuestaCierre = useClave();

  const poner = (campo: string, valor: ErrorCaso) => setErrores((previo) => ({ ...previo, [campo]: valor }));
  const refrescar = () => router.refresh();
  const parte = partes.find((fila) => fila.userId === parteElegida) ?? null;

  /** Corre una operación: limpia el error del campo, muestra el error propio o el éxito y refresca la ficha. */
  const correr = (campo: string, tarea: () => Promise<{ ok: true; mensaje: string } | { ok: false; codigo: string }>) =>
    iniciar(async () => {
      poner(campo, null);
      setExito('');
      try {
        const resultado = await tarea();
        if (resultado.ok) { setExito(resultado.mensaje); refrescar(); }
        else poner(campo, { codigo: resultado.codigo });
      } catch {
        poner(campo, { codigo: 'FORBIDDEN' });
      }
    });

  const guardarCategoria = () =>
    correr('categoria', async () => {
      const resultado = await clasificarCaso(casoId, categoriaElegida, claveCategoria.obtener());
      if (!resultado.ok) return resultado;
      claveCategoria.reiniciar();
      return { ok: true as const, mensaje: resultado.replayed ? 'La categoría ya estaba guardada.' : 'Categoría guardada.' };
    });

  const cambiarEstado = () =>
    correr('estado', async () => {
      const resultado = await cambiarEstadoCaso(casoId, estadoElegido, claveEstado.obtener());
      if (!resultado.ok) return resultado;
      claveEstado.reiniciar();
      return { ok: true as const, mensaje: resultado.replayed ? 'El estado ya estaba cambiado.' : 'Estado actualizado.' };
    });

  const guardarNota = () =>
    correr('nota', async () => {
      const resultado = await agregarNotaCaso(casoId, nota, claveNota.obtener());
      if (!resultado.ok) return resultado;
      claveNota.reiniciar();
      setNota('');
      return { ok: true as const, mensaje: resultado.replayed ? 'La nota ya estaba guardada.' : 'Nota guardada.' };
    });

  const enviarRespuesta = () =>
    correr('respuesta', async () => {
      const resultado = await responderCaso(casoId, respuesta, claveRespuesta.obtener());
      if (!resultado.ok) return resultado;
      claveRespuesta.reiniciar();
      setRespuesta('');
      const base = resultado.replayed ? 'Esa respuesta ya estaba enviada.' : 'Respuesta enviada al reportante.';
      return {
        ok: true as const,
        mensaje: resultado.avisoFallido ? `${base} El aviso por mail o push no salió; la respuesta igual queda guardada y la persona la ve en la app.` : base,
      };
    });

  const necesitaRespuesta = modoCierre === 'resolver' && !respondidoAt && !respuestaEnviada;
  const cierreValido = resolucion.trim() !== '' && (!necesitaRespuesta || respuestaCierre.trim() !== '');

  const cerrarCaso = () =>
    correr('cierre', async () => {
      if (modoCierre === null) return { ok: false as const, codigo: 'INVALID_INPUT' };
      let avisoFallido = false;
      if (necesitaRespuesta) {
        // Resolver exige haber respondido: primero la respuesta y, sólo si salió bien, la resolución.
        const enviada = await responderCaso(casoId, respuestaCierre, claveRespuestaCierre.obtener());
        if (!enviada.ok) return enviada;
        setRespuestaEnviada(true);
        avisoFallido = enviada.avisoFallido;
      }
      const cierre = modoCierre === 'resolver'
        ? await resolverCaso(casoId, resolucion, claveCierre.obtener())
        : await desestimarCaso(casoId, resolucion, claveCierre.obtener());
      if (!cierre.ok) return cierre;
      claveCierre.reiniciar();
      claveRespuestaCierre.reiniciar();
      setModoCierre(null);
      setResolucion('');
      setRespuestaCierre('');
      const base = modoCierre === 'resolver' ? 'Caso resuelto.' : 'Caso desestimado.';
      return { ok: true as const, mensaje: avisoFallido ? `${base} El aviso de la respuesta no salió por mail o push; queda guardada igual.` : base };
    });

  return (
    <section className="acciones acciones-caso" aria-labelledby="acciones-caso-titulo">
      <div className="acciones-caso-cabecera">
        <p className="sobrelinea">Acciones</p>
        <h2 id="acciones-caso-titulo">Trabajar el caso</h2>
      </div>

      {exito && <p className="exito" role="status">{exito}</p>}
      {cerrado && (
        <p className="aviso" role="note">
          El caso está cerrado y no se reabre. Sólo podés clasificarlo, agregar notas y vincular sanciones.
        </p>
      )}

      <div className="panel-caso">
        <h3>Clasificar</h3>
        <label>Categoría
          <select value={categoriaElegida} onChange={(evento) => { setCategoriaElegida(evento.target.value); claveCategoria.reiniciar(); }}>
            <option value="">Elegí una categoría</option>
            {CATEGORIAS_CASO.map((clave) => <option key={clave} value={clave}>{TEXTO_CATEGORIA[clave]}</option>)}
          </select>
        </label>
        <MensajeError error={errores.categoria ?? null} casoId={casoId} alTomar={refrescar} />
        <div className="botonera"><button className="secundario" disabled={pendiente || !categoriaElegida || categoriaElegida === categoria} onClick={guardarCategoria}>Guardar categoría</button></div>
      </div>

      {!cerrado && (
        <div className="panel-caso">
          <h3>Cambiar estado</h3>
          <p className="ayuda">Entre los tres estados abiertos. Para cerrar el caso usá «Resolver» o «Desestimar».</p>
          <label>Estado
            <select value={estadoElegido} onChange={(evento) => { setEstadoElegido(evento.target.value); claveEstado.reiniciar(); }}>
              <option value="">Elegí un estado</option>
              {ESTADOS_ABIERTOS.map((clave) => <option key={clave} value={clave}>{TEXTO_ESTADO[clave]}</option>)}
            </select>
          </label>
          <MensajeError error={errores.estado ?? null} casoId={casoId} alTomar={refrescar} />
          <div className="botonera"><button className="secundario" disabled={pendiente || !estadoElegido || estadoElegido === estado} onClick={cambiarEstado}>Cambiar estado</button></div>
        </div>
      )}

      <div className="panel-caso">
        <h3>Nota interna</h3>
        <label>Nota (sólo la ve el equipo)
          <textarea value={nota} onChange={(evento) => { setNota(evento.target.value); claveNota.reiniciar(); }} maxLength={2000} autoComplete="off" aria-describedby="ayuda-nota" />
        </label>
        <p id="ayuda-nota" className="advertencia">{AVISO_NOTA}</p>
        <MensajeError error={errores.nota ?? null} casoId={casoId} alTomar={refrescar} />
        <div className="botonera"><button className="secundario" disabled={pendiente || nota.trim() === ''} onClick={guardarNota}>Agregar nota</button></div>
      </div>

      {!cerrado && (
        <div className="panel-caso">
          <h3>Responder al reportante</h3>
          <p className="ayuda">{respondidoAt ? `Ya respondiste el ${fecha(respondidoAt)}. Podés enviar otra respuesta si hace falta.` : 'Todavía no le respondiste. Resolver el caso exige haber respondido.'}</p>
          <label>Mensaje para quien reportó
            <textarea value={respuesta} onChange={(evento) => { setRespuesta(evento.target.value); claveRespuesta.reiniciar(); }} maxLength={1000} autoComplete="off" aria-describedby="ayuda-respuesta" />
          </label>
          <p id="ayuda-respuesta" className="advertencia">{AVISO_RESPUESTA}</p>
          <MensajeError error={errores.respuesta ?? null} casoId={casoId} alTomar={refrescar} />
          <div className="botonera"><button disabled={pendiente || respuesta.trim() === ''} onClick={enviarRespuesta}>{pendiente ? 'Enviando…' : 'Enviar respuesta'}</button></div>
        </div>
      )}

      {!cerrado && (
        <div className="panel-caso">
          <h3>Cerrar el caso</h3>
          {modoCierre === null ? (
            <div className="botonera">
              <button onClick={() => setModoCierre('resolver')}>Resolver…</button>
              <button className="secundario" onClick={() => setModoCierre('desestimar')}>Desestimar…</button>
            </div>
          ) : (
            <div className="confirmacion">
              <p className="advertencia">
                {modoCierre === 'resolver'
                  ? 'Un caso cerrado no se reabre. «Resolver» y «Desestimar» no dicen quién tenía razón: sólo que el equipo cerró el caso.'
                  : 'Un caso cerrado no se reabre. Desestimar no exige haber respondido.'}
              </p>
              {necesitaRespuesta && (
                <>
                  <label>Respuesta al reportante (obligatoria: todavía no le respondiste)
                    <textarea value={respuestaCierre} onChange={(evento) => { setRespuestaCierre(evento.target.value); claveRespuestaCierre.reiniciar(); }} maxLength={1000} autoComplete="off" aria-describedby="ayuda-respuesta-cierre" />
                  </label>
                  <p id="ayuda-respuesta-cierre" className="advertencia">{AVISO_RESPUESTA}</p>
                </>
              )}
              {modoCierre === 'resolver' && respuestaEnviada && !respondidoAt && <p className="ayuda">La respuesta ya se envió. Falta la resolución.</p>}
              <label>Resolución (obligatoria, sólo para el equipo)
                <textarea value={resolucion} onChange={(evento) => { setResolucion(evento.target.value); claveCierre.reiniciar(); }} maxLength={2000} autoComplete="off" aria-describedby="ayuda-resolucion" />
              </label>
              <p id="ayuda-resolucion" className="ayuda">{AVISO_NOTA}</p>
              <MensajeError error={errores.cierre ?? null} casoId={casoId} alTomar={refrescar} />
              <div className="botonera">
                <button className={modoCierre === 'desestimar' ? 'secundario' : undefined} disabled={pendiente || !cierreValido} onClick={cerrarCaso}>
                  {pendiente ? 'Cerrando…' : modoCierre === 'resolver' ? (necesitaRespuesta ? 'Responder y resolver' : 'Resolver caso') : 'Desestimar caso'}
                </button>
                <button className="secundario" disabled={pendiente} onClick={() => { setModoCierre(null); poner('cierre', null); }}>Volver</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="panel-caso">
        <h3>Sancionar desde el caso</h3>
        {partes.length === 0 ? (
          <p className="ayuda">Ninguna de las dos cuentas existe: no hay a quién sancionar.</p>
        ) : (
          <>
            <p className="ayuda">
              Se aplica con las mismas acciones de la ficha de usuario, con su motivo y su confirmación, y después queda vinculada al caso.
              Puede ser la persona reportada o quien reportó, si abusó del canal.
            </p>
            <label>A quién
              <select value={parteElegida} onChange={(evento) => setParteElegida(evento.target.value)}>
                {partes.map((fila) => <option key={fila.userId} value={fila.userId}>{fila.etiqueta}: {fila.alias}</option>)}
              </select>
            </label>
            <div className="grupo-acciones">
              <button className="secundario" disabled={!parte} onClick={() => setSancion('advertir')}>Advertir</button>
              <button className="peligro" disabled={!parte} onClick={() => setSancion('suspender')}>Suspender…</button>
              <button className="peligro" disabled={!parte} onClick={() => setSancion('bloquear')}>Bloquear definitivamente…</button>
            </div>
          </>
        )}
      </div>

      {sancion && parte && (
        <DialogosSancion accion={sancion} userId={parte.userId} alias={parte.alias} casoId={casoId} cerrar={() => setSancion(null)} />
      )}
    </section>
  );
}
