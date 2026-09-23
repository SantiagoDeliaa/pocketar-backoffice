import Link from 'next/link';
import { exigirStaff } from '@/lib/staff';
import { buscarUsuarios } from '@/lib/datos/usuarios';
import { fecha } from '@/lib/formato';

export const dynamic = 'force-dynamic';

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  await exigirStaff();
  const parametros = await searchParams;
  const q = (Array.isArray(parametros.q) ? parametros.q[0] : parametros.q) ?? '';
  const termino = q.trim();
  const filas = termino.length >= 2 ? await buscarUsuarios(termino) : null;

  return (
    <main className="contenedor">
      <header className="encabezado">
        <div>
          <p className="sobrelinea">Cuentas</p>
          <h1>Usuarios</h1>
          <p>Buscá por ID, usuario público, nombre, mail o teléfono. El contacto se muestra tapado.</p>
        </div>
      </header>
      <form method="get" action="/usuarios" role="search" className="busqueda-usuarios">
        <label htmlFor="q">Buscar usuario</label>
        <div className="botonera">
          <input id="q" name="q" defaultValue={q} minLength={2} maxLength={100} required autoComplete="off" placeholder="ID, usuario público, nombre, mail o teléfono" />
          <button type="submit">Buscar</button>
        </div>
      </form>
      {filas === null ? (
        <p className="ayuda">{termino ? 'Escribí al menos dos caracteres.' : 'Escribí algo para empezar.'}</p>
      ) : filas.length === 0 ? (
        <div className="vacio"><h2>Sin resultados</h2><p>No encontramos cuentas con ese dato. Probá con otro.</p></div>
      ) : (
        <>
          <p className="resultado">{filas.length} {filas.length === 1 ? 'cuenta' : 'cuentas'}</p>
          <div className="lista-publicaciones">
            {filas.map((fila) => (
              <Link href={`/usuarios/${fila.id}`} key={fila.id} className="fila-usuario">
                <div><strong>{fila.alias}</strong><span>{fila.nombre}</span></div>
                <div className="mono"><span>Mail</span><strong>{fila.mailOfuscado}</strong></div>
                <div className="mono"><span>Teléfono</span><strong>{fila.telefonoOfuscado}</strong></div>
                <div><span>Alta</span><strong>{fecha(fila.creadoAt)}</strong></div>
                {fila.borradoProgramado && <span className="etiqueta">Borrado programado</span>}
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
