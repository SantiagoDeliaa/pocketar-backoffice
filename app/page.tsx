import { exigirStaff } from '@/lib/staff';

export const dynamic = 'force-dynamic';

export default async function Inicio() {
  const staff = await exigirStaff();

  return (
    <main style={{ padding: '24px', maxWidth: 880, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 4 }}>Backoffice</h1>
      <p style={{ color: 'var(--atenuado)', marginTop: 0 }}>
        Sesion iniciada como <span className="mono">{staff.email}</span>
      </p>

      <p style={{ marginTop: 32, color: 'var(--atenuado)' }}>
        Scaffold. La cola de revision es el Bloque 3 del plan.
      </p>
    </main>
  );
}
