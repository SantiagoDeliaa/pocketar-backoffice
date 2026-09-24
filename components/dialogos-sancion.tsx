'use client';

import { useState } from 'react';
import { DialogoAccion } from '@/components/dialogo-accion';
import { advertirUsuario, bloquearUsuarioDefinitivo, suspenderUsuario } from '@/lib/acciones/usuarios';
import { sancionarDesdeCaso } from '@/lib/acciones/reportes';
import { ESCALONES_SUSPENSION } from '@/lib/tipos/usuarios';

export type AccionSancion = 'advertir' | 'suspender' | 'bloquear';

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

type Props = {
  accion: AccionSancion;
  userId: string;
  alias: string;
  cerrar: () => void;
  /** Si viene, la sanción se aplica con las mismas acciones y después se vincula a este caso. */
  casoId?: string;
};

/** Advertir, suspender y bloquear, con la misma UI y la misma fricción desde la ficha de usuario y desde un caso. */
export function DialogosSancion({ accion, userId, alias, cerrar, casoId }: Props) {
  const [escalon, setEscalon] = useState('');

  if (accion === 'advertir') {
    return (
      <DialogoAccion
        titulo="Advertir a esta cuenta"
        etiquetaConfirmar="Enviar advertencia"
        etiquetaPendiente="Enviando…"
        cerrar={cerrar}
        userId={userId}
        ejecutar={(clave, motivo) =>
          casoId ? sancionarDesdeCaso(casoId, userId, 'advertir', null, motivo, clave) : advertirUsuario(userId, motivo, clave)
        }
      >
        <p className="advertencia">
          Una advertencia no bloquea nada: la persona sigue entrando y operando con normalidad. Le llega un aviso por
          mail y en la app, sin decirle el motivo, y queda anotada en el historial.
        </p>
      </DialogoAccion>
    );
  }

  if (accion === 'suspender') {
    return (
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
        ejecutar={(clave, motivo) =>
          casoId
            ? sancionarDesdeCaso(casoId, userId, 'suspender', escalon, motivo, clave)
            : suspenderUsuario(userId, escalon, motivo, clave)
        }
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
    );
  }

  return (
    <DialogoAccion
      titulo="Bloquear definitivamente esta cuenta"
      etiquetaConfirmar="Bloquear cuenta"
      etiquetaPendiente="Bloqueando…"
      cerrar={cerrar}
      peligro
      userId={userId}
      textoConfirmacion={alias}
      etiquetaTextoConfirmacion="Para confirmar, escribí el nombre de usuario"
      ejecutar={(clave, motivo) =>
        casoId ? sancionarDesdeCaso(casoId, userId, 'bloquear', null, motivo, clave) : bloquearUsuarioDefinitivo(userId, motivo, clave)
      }
    >
      <QueSeCancela definitivo />
    </DialogoAccion>
  );
}
