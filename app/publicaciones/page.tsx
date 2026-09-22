import { exigirStaff } from '@/lib/staff';
import { obtenerPublicacionesAbiertas } from '@/lib/datos/revision';
import { ListaPublicaciones } from '@/components/lista-publicaciones';

export const dynamic = 'force-dynamic';

export default async function Publicaciones() {
  await exigirStaff();
  const filas = await obtenerPublicacionesAbiertas();
  return <main className="contenedor"><header className="encabezado"><div><p className="sobrelinea">Publicadas</p><h1>Publicaciones activas</h1><p>La baja requiere confirmar el título y explica el motivo al vendedor.</p></div></header><ListaPublicaciones filas={filas} /></main>;
}
