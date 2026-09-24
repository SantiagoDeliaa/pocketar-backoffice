import { exigirStaff } from '@/lib/staff';
import { obtenerMotivosRechazo } from '@/lib/datos/motivos';
import { mensajeDeError } from '@/lib/errores';
import { ListaMotivos } from '@/components/motivos-rechazo';

export const dynamic = 'force-dynamic';

export default async function MotivosRechazo() {
  await exigirStaff();
  const resultado = await obtenerMotivosRechazo();

  return (
    <main className="contenedor">
      <header className="encabezado">
        <div>
          <p className="sobrelinea">Configuración</p>
          <h1>Motivos de rechazo</h1>
          <p>
            Son los motivos que se eligen al rechazar una publicación. El texto de cada uno lo lee el vendedor.
            Editar un motivo no cambia los rechazos que ya se hicieron. No se borran motivos: para sacar uno, desactivalo.
          </p>
        </div>
      </header>

      {!resultado.ok ? (
        <p className="error" role="alert">
          No pudimos cargar los motivos. {mensajeDeError(resultado.codigo)} Actualizá la página.
        </p>
      ) : (
        <ListaMotivos motivos={resultado.motivos} />
      )}
    </main>
  );
}
