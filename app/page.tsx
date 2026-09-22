import { exigirStaff } from '@/lib/staff';
import { obtenerResumenInicio } from '@/lib/datos/revision';
import { tiempoSla } from '@/lib/formato';

export const dynamic = 'force-dynamic';

export default async function Inicio() {
  await exigirStaff();
  const resumen = await obtenerResumenInicio();
  const sla = tiempoSla(resumen.masAntigua);

  return (
    <main className="contenedor">
      <header className="encabezado"><div><p className="sobrelinea">Operación diaria</p><h1>Inicio</h1><p>Priorizá siempre la publicación que está más cerca del plazo comprometido.</p></div></header>
      <section className="metricas" aria-label="Resumen operativo">
        <article className={`metrica principal ${sla.estado}`}><span>Publicación más antigua sin revisar</span><strong>{resumen.masAntigua ? sla.texto : 'Sin cola'}</strong><p>{resumen.masAntigua ? 'Contado desde su último envío a revisión.' : 'No hay publicaciones esperando revisión.'}</p></article>
        <article className="metrica"><span>En cola</span><strong className="mono">{resumen.enCola}</strong><p>Publicaciones pendientes de revisión.</p></article>
        <article className="metrica urgente"><span>Por vencer</span><strong className="mono">{resumen.porVencer}</strong><p>Entraron en las últimas seis horas del SLA.</p></article>
        <article className="metrica"><span>Activas</span><strong className="mono">{resumen.activas}</strong><p>Publicaciones visibles que pueden recibir ofertas.</p></article>
      </section>
    </main>
  );
}
