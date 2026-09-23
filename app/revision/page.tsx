import { exigirStaff } from '@/lib/staff';
import { obtenerColaRevision } from '@/lib/datos/revision';
import { obtenerCatalogoRevision } from '@/lib/acciones/revision';
import { FiltrosRevision } from '@/components/filtros-revision';

export const dynamic = 'force-dynamic';

export default async function Revision() {
  const staff = await exigirStaff();
  const [filas, resultadoCatalogo] = await Promise.all([
    obtenerColaRevision(),
    obtenerCatalogoRevision(),
  ]);
  return <main className="contenedor"><header className="encabezado"><div><p className="sobrelinea">SLA de 48 horas</p><h1>Cola de revisión</h1><p>La lista está ordenada por antigüedad. La prioridad es el tiempo restante.</p></div></header><FiltrosRevision filas={filas} miembros={resultadoCatalogo.ok ? resultadoCatalogo.catalogo.miembros : []} staffId={staff.userId} /></main>;
}
