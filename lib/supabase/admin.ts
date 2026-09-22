import 'server-only';

import { createClient } from '@supabase/supabase-js';

/**
 * Cliente con service_role. D-59: NUNCA se importa desde un Componente de Cliente.
 *
 * Sólo para lecturas privilegiadas del panel, Auth Admin API, borrado de imágenes
 * y el envío best-effort a send_notification después de que una RPC de negocio
 * haya terminado con éxito. Nunca se usa para invocar una RPC staff.fn_*.
 */
export function crearClienteAdmin() {
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clave) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY. Es variable de servidor, sin NEXT_PUBLIC_.');
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, clave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
