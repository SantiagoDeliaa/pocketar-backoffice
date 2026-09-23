import Link from 'next/link';
import { notFound } from 'next/navigation';
import { exigirStaff } from '@/lib/staff';
import { obtenerCatalogoRevision } from '@/lib/acciones/revision';
import { obtenerCooldownsVigentes, obtenerHistorial, obtenerUsuarioBasico } from '@/lib/datos/usuarios';
import { fecha } from '@/lib/formato';
import { textoEscalon, type SancionVigente } from '@/lib/tipos/usuarios';
import { AccionesUsuario } from '@/components/acciones-usuario';
import { CooldownsUsuario } from '@/components/cooldowns-usuario';
import { HistorialPenalizaciones } from '@/components/historial-penalizaciones';
import { RevelarContacto } from '@/components/revelar-contacto';

export const dynamic = 'force-dynamic';

function estadoCuenta(vigente: SancionVigente | null) {
  if (!vigente) return { clase: 'activa', texto: 'Cuenta activa' };
  if (vigente.tipo === 'bloqueo_definitivo') return { clase: 'bloqueada', texto: 'Bloqueada definitivamente' };
  return { clase: 'suspendida', texto: `Suspendida hasta ${fecha(vigente.vence_at)} (${textoEscalon(vigente.escalon)})` };
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return <div className="dato"><span>{etiqueta}</span><strong>{valor}</strong></div>;
}

export default async function FichaUsuario({ params }: { params: Promise<{ id: string }> }) {
  await exigirStaff();
  const { id } = await params;
  const usuario = await obtenerUsuarioBasico(id);
  if (!usuario) notFound();

  // El estado y el historial se leen en el server en cada render: nunca se derivan en el cliente ni se cachean.
  const [historial, catalogo, cooldowns] = await Promise.all([
    obtenerHistorial(usuario.id),
    obtenerCatalogoRevision(),
    obtenerCooldownsVigentes(usuario.id),
  ]);
  const nombres: Record<string, string> = Object.fromEntries(
    (catalogo.ok ? catalogo.catalogo.miembros : []).map((miembro) => [miembro.user_id, miembro.nombre]),
  );
  const estado = historial.ok ? estadoCuenta(historial.historial.sancionVigente) : null;
  const nombre = [usuario.firstName, usuario.apellido].filter(Boolean).join(' ');

  return (
    <main className="contenedor detalle">
      <p><Link href="/usuarios">← Volver a la búsqueda</Link></p>
      <header className="encabezado-detalle">
        <div>
          <p className="sobrelinea">Ficha de usuario</p>
          <h1>{usuario.alias}</h1>
          <p>{nombre || 'Sin nombre cargado'}</p>
        </div>
        {estado && <div className={`estado-cuenta ${estado.clase}`} role="status"><span>Estado de la cuenta</span><strong>{estado.texto}</strong></div>}
      </header>

      {usuario.borradoProgramado && (
        <p className="aviso" role="status">Esta cuenta tiene un borrado programado para el {fecha(usuario.borradoProgramado)}.</p>
      )}

      <section className="bloque" aria-labelledby="historial-titulo">
        <h2 id="historial-titulo">Historial de penalizaciones</h2>
        <p className="ayuda">Mirá esto antes de decidir: la escala no avanza sola, el escalón lo elegís vos.</p>
        {historial.ok
          ? <HistorialPenalizaciones penalizaciones={historial.historial.penalizaciones} nombres={nombres} />
          : <p className="error" role="alert">No pudimos cargar el historial ni el estado de la cuenta. No tomes ninguna decisión hasta que cargue: actualizá la página.</p>}
      </section>

      <section className="bloque" aria-labelledby="datos-titulo">
        <h2 id="datos-titulo">Datos básicos</h2>
        <div className="grilla-datos">
          <Dato etiqueta="ID" valor={usuario.id} />
          <Dato etiqueta="Usuario público" valor={usuario.alias} />
          <Dato etiqueta="Alta" valor={fecha(usuario.creadoAt)} />
          <Dato etiqueta="Nombre" valor={nombre || '—'} />
          <Dato etiqueta="Fecha de nacimiento" valor={usuario.fechaNacimiento ?? '—'} />
          <Dato etiqueta="Provincia" valor={usuario.provincia ?? '—'} />
          <Dato etiqueta="Ciudad" valor={usuario.ciudad ?? '—'} />
          <Dato etiqueta="Ventas completadas" valor={String(usuario.ventasCompletadas)} />
          <Dato etiqueta="Compras completadas" valor={String(usuario.comprasCompletadas)} />
        </div>
      </section>

      <RevelarContacto userId={usuario.id} />

      <section className="bloque" aria-labelledby="cooldowns-titulo">
        <h2 id="cooldowns-titulo">Cooldowns vigentes</h2>
        <CooldownsUsuario userId={usuario.id} cooldowns={cooldowns} />
      </section>

      {historial.ok && (
        <AccionesUsuario
          userId={usuario.id}
          alias={usuario.alias}
          actuales={{
            firstName: usuario.firstName,
            apellido: usuario.apellido,
            fechaNacimiento: usuario.fechaNacimiento,
            provincia: usuario.provincia,
            ciudad: usuario.ciudad,
          }}
        />
      )}
    </main>
  );
}
