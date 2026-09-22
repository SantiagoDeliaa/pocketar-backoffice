import { exigirStaff } from '@/lib/staff';
import { obtenerCatalogoRevision } from '@/lib/acciones/revision';
import type { CatalogoRevision } from '@/lib/tipos/revision';
import { DetalleRevision } from '@/components/detalle-revision';

export const dynamic = 'force-dynamic';

export default async function RevisionDetalle({ params }: { params: Promise<{ id: string }> }) {
  await exigirStaff();
  const { id } = await params;
  const resultadoCatalogo = await obtenerCatalogoRevision();
  const catalogo: CatalogoRevision = resultadoCatalogo.ok
    ? resultadoCatalogo.catalogo
    : { motivos: [], miembros: [] };
  return <DetalleRevision
    id={id}
    motivos={catalogo.motivos}
    motivosDisponibles={resultadoCatalogo.ok}
  />;
}
