'use client';

import { useState } from 'react';
import { DialogoAccion } from '@/components/dialogo-accion';
import { anularCooldownVendedor } from '@/lib/acciones/usuarios';
import { fecha } from '@/lib/formato';
import type { CooldownVigente } from '@/lib/tipos/usuarios';

function FilaCooldown({ userId, cooldown }: { userId: string; cooldown: CooldownVigente }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <li className="fila-cooldown">
      <div>
        <strong>{cooldown.descripcion}</strong>
        <span className="ayuda">Hasta {fecha(cooldown.hasta)}</span>
      </div>
      <button className="secundario" onClick={() => setAbierto(true)}>Anular cooldown</button>
      {abierto && (
        <DialogoAccion
          titulo="Anular cooldown"
          etiquetaConfirmar="Anular cooldown"
          etiquetaPendiente="Anulando…"
          cerrar={() => setAbierto(false)}
          ejecutar={(clave, motivo) => anularCooldownVendedor(userId, cooldown.varianteId, motivo, clave)}
        >
          <p className="advertencia">
            El vendedor va a poder volver a publicar «{cooldown.descripcion}» de inmediato.
          </p>
        </DialogoAccion>
      )}
    </li>
  );
}

export function CooldownsUsuario({ userId, cooldowns }: { userId: string; cooldowns: CooldownVigente[] }) {
  if (cooldowns.length === 0) return <p className="ayuda">No tiene cooldowns vigentes.</p>;
  return <ul className="lista-cooldowns">{cooldowns.map((fila) => <FilaCooldown key={fila.varianteId} userId={userId} cooldown={fila} />)}</ul>;
}
