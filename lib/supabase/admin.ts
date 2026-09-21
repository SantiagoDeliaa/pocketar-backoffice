import { createClient } from '@supabase/supabase-js';

/**
 * Cliente con service_role. D-59: NUNCA se importa desde un Componente de Cliente.
 *
 * Solo para lo que no puede pasar por una RPC de staff: Auth Admin API
 * (reenvio de verificacion, recuperacion de contrasena) y borrado de imagenes.
 * Para todo lo demas va el cliente de sesion + una RPC staff.fn_* (D-58).
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
