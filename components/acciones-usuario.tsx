'use client';

import { useState } from 'react';
import { DialogoAccion } from '@/components/dialogo-accion';
import {
  advertirUsuario,
  bloquearUsuarioDefinitivo,
  corregirDatosUsuario,
  dispararRecuperacionPassword,
  liberarNombreDeUsuario,
  reenviarVerificacionMail,
  suspenderUsuario,
} from '@/lib/acciones/usuarios';
import { ESCALONES_SUSPENSION, PROVINCIAS } from '@/lib/tipos/usuarios';

type Accion = 'advertir' | 'suspender' | 'bloquear' | 'alias' | 'datos' | 'verificacion' | 'recuperacion';

type Props = {
  userId: string;
  alias: string;
  actuales: { firstName: string | null; apellido: string | null; fechaNacimiento: string | null; provincia: string | null; ciudad: string | null };
};

const CAMPOS_VACIOS = { first_name: '', apellido: '', fecha_nacimiento: '', localidad_provincia: '', localidad_ciudad: '', phone: '' };

function QueSeCancela({ definitivo }: { definitivo: boolean }) {
  return (
    <div className="advertencia" role="note">
      <p><strong>Qué se va a cancelar</strong></p>
      <ul>
        <li>Todas las publicaciones de la cuenta que estén en revisión o abiertas se cancelan, y las ofertas que recibieron se rechazan.</li>
        <li>Todas las ofertas pendientes que hizo la cuenta se cancelan, y en las publicaciones abiertas se recalcula la última oferta.</li>
        <li>Las operaciones aceptadas que esperan la confirmación de entrega se dan de baja para las dos partes.</li>
        <li>Se avisa a las contrapartes, sin decirles el motivo. Lo que ya está finalizado no se toca.</li>
        <li>Nada de lo cancelado reaparece al rehabilitar la cuenta.</li>
        <li>
          {definitivo
            ? 'La cuenta no puede iniciar sesión y el bloqueo no vence solo: se levanta desde el historial con «Rehabilitar».'
            : 'La cuenta no puede iniciar sesión hasta que venza el plazo o la rehabilites desde el historial.'}
        </li>
      </ul>
    </div>
  );
}

export function AccionesUsuario({ userId, alias, actuales }: Props) {
  const [abierta, setAbierta] = useState<Accion | null>(null);
  const [escalon, setEscalon] = useState('');
  const [campos, setCampos] = useState(CAMPOS_VACIOS);
  const cerrar = () => { setAbierta(null); setEscalon(''); setCampos(CAMPOS_VACIOS); };
  const hayCambios = Object.values(campos).some((valor) => valor.trim() !== '');
  const cambiar = (campo: keyof typeof CAMPOS_VACIOS) => (evento: { target: { value: string } }) =>
    setCampos((previo) => ({ ...previo, [campo]: evento.target.value }));

  return (
    <section className="bloque" aria-labelledby="acciones-cuenta">
      <h2 id="acciones-cuenta">Acciones sobre la cuenta</h2>
      <p className="ayuda">Cada acción pide un motivo y queda registrada. La escala de sanciones no avanza sola: el escalón lo elegís vos, después de mirar el historial.</p>
      <div className="grupo-acciones">
        <button className="secundario" onClick={() => setAbierta('advertir')}>Advertir</button>
        <button className="peligro" onClick={() => setAbierta('suspender')}>Suspender…</button>
        <button className="peligro" onClick={() => setAbierta('bloquear')}>Bloquear definitivamente…</button>
      </div>
      <div className="grupo-acciones">
        <button className="secundario" onClick={() => setAbierta('alias')}>Liberar nombre de usuario</button>
        <button className="secundario" onClick={() => setAbierta('datos')}>Corregir datos personales</button>
        <button className="secundario" onClick={() => setAbierta('verificacion')}>Reenviar mail de verificación</button>
        <button className="secundario" onClick={() => setAbierta('recuperacion')}>Disparar recuperación de contraseña</button>
      </div>

      {abierta === 'advertir' && (
        <DialogoAccion
          titulo="Advertir a esta cuenta"
          etiquetaConfirmar="Enviar advertencia"
          etiquetaPendiente="Enviando…"
          cerrar={cerrar}
          userId={userId}
          ejecutar={(clave, motivo) => advertirUsuario(userId, motivo, clave)}
        >
          <p className="advertencia">
            Una advertencia no bloquea nada: la persona sigue entrando y operando con normalidad. Le llega un aviso por
            mail y en la app, sin decirle el motivo, y queda anotada en el historial.
          </p>
        </DialogoAccion>
      )}

      {abierta === 'suspender' && (
        <DialogoAccion
          titulo="Suspender esta cuenta"
          etiquetaConfirmar="Suspender cuenta"
          etiquetaPendiente="Suspendiendo…"
          cerrar={cerrar}
          peligro
          userId={userId}
          valido={escalon !== ''}
          textoConfirmacion={alias}
          etiquetaTextoConfirmacion="Para confirmar, escribí el nombre de usuario"
          ejecutar={(clave, motivo) => suspenderUsuario(userId, escalon, motivo, clave)}
        >
          <QueSeCancela definitivo={false} />
          <label>
            Duración de la suspensión
            <select value={escalon} onChange={(evento) => setEscalon(evento.target.value)} required aria-required="true">
              <option value="">Elegí un escalón</option>
              {ESCALONES_SUSPENSION.map((fila) => <option key={fila.valor} value={fila.valor}>{fila.texto}</option>)}
            </select>
          </label>
        </DialogoAccion>
      )}

      {abierta === 'bloquear' && (
        <DialogoAccion
          titulo="Bloquear definitivamente esta cuenta"
          etiquetaConfirmar="Bloquear cuenta"
          etiquetaPendiente="Bloqueando…"
          cerrar={cerrar}
          peligro
          userId={userId}
          textoConfirmacion={alias}
          etiquetaTextoConfirmacion="Para confirmar, escribí el nombre de usuario"
          ejecutar={(clave, motivo) => bloquearUsuarioDefinitivo(userId, motivo, clave)}
        >
          <QueSeCancela definitivo />
        </DialogoAccion>
      )}

      {abierta === 'alias' && (
        <DialogoAccion
          titulo="Liberar el nombre de usuario"
          etiquetaConfirmar="Liberar nombre de usuario"
          etiquetaPendiente="Liberando…"
          cerrar={cerrar}
          ejecutar={(clave, motivo) => liberarNombreDeUsuario(userId, motivo, clave)}
        >
          <p className="advertencia">
            El nombre de usuario actual queda libre para que lo use otra persona y la cuenta pasa a un nombre provisorio.
          </p>
        </DialogoAccion>
      )}

      {abierta === 'datos' && (
        <DialogoAccion
          titulo="Corregir datos personales"
          etiquetaConfirmar="Guardar correcciones"
          etiquetaPendiente="Guardando…"
          cerrar={cerrar}
          valido={hayCambios}
          userId={userId}
          ejecutar={(clave, motivo) => corregirDatosUsuario(userId, campos, motivo, clave)}
        >
          <p className="ayuda">
            Sólo se cambian los campos que completes. El mail no se corrige desde acá. Si cambiás el teléfono y la cuenta
            tiene operaciones en curso, se avisa a la contraparte que el teléfono cambió (sin decir el número).
          </p>
          <label>Nombre<input value={campos.first_name} onChange={cambiar('first_name')} placeholder={actuales.firstName ? `Actual: ${actuales.firstName}` : 'Sin cambios'} autoComplete="off" /></label>
          <label>Apellido<input value={campos.apellido} onChange={cambiar('apellido')} placeholder={actuales.apellido ? `Actual: ${actuales.apellido}` : 'Sin cambios'} autoComplete="off" /></label>
          <label>Fecha de nacimiento<input type="date" value={campos.fecha_nacimiento} onChange={cambiar('fecha_nacimiento')} aria-describedby="fecha-actual" /></label>
          <p id="fecha-actual" className="ayuda">{actuales.fechaNacimiento ? `Actual: ${actuales.fechaNacimiento}` : 'Sin cambios'}</p>
          <label>Provincia
            <select value={campos.localidad_provincia} onChange={cambiar('localidad_provincia')}>
              <option value="">{actuales.provincia ? `Sin cambios (${actuales.provincia})` : 'Sin cambios'}</option>
              {PROVINCIAS.map((provincia) => <option key={provincia} value={provincia}>{provincia}</option>)}
            </select>
          </label>
          <label>Ciudad<input value={campos.localidad_ciudad} onChange={cambiar('localidad_ciudad')} placeholder={actuales.ciudad ? `Actual: ${actuales.ciudad}` : 'Sin cambios'} autoComplete="off" /></label>
          <label>Teléfono<input type="tel" value={campos.phone} onChange={cambiar('phone')} placeholder="Sin cambios. Ej.: 011 5000-1234" autoComplete="off" /></label>
        </DialogoAccion>
      )}

      {abierta === 'verificacion' && (
        <DialogoAccion
          titulo="Reenviar mail de verificación"
          etiquetaConfirmar="Reenviar mail"
          etiquetaPendiente="Enviando…"
          cerrar={cerrar}
          ejecutar={(_clave, motivo) => reenviarVerificacionMail(userId, motivo)}
        >
          <p className="advertencia">Se le vuelve a mandar el mail de verificación a la casilla registrada. Vos no ves ni cambiás el mail.</p>
        </DialogoAccion>
      )}

      {abierta === 'recuperacion' && (
        <DialogoAccion
          titulo="Disparar recuperación de contraseña"
          etiquetaConfirmar="Enviar mail de recuperación"
          etiquetaPendiente="Enviando…"
          cerrar={cerrar}
          ejecutar={(_clave, motivo) => dispararRecuperacionPassword(userId, motivo)}
        >
          <p className="advertencia">Se le manda al titular un mail para que elija una contraseña nueva. Vos no ves ni fijás ninguna contraseña.</p>
        </DialogoAccion>
      )}
    </section>
  );
}
