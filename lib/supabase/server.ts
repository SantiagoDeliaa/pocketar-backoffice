import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Cliente con la sesion del staff. Respeta RLS y los permisos del rol.
 * Es el cliente por defecto: usar este salvo que la operacion exija service_role.
 */
export async function crearClienteServidor() {
  const almacenDeCookies = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return almacenDeCookies.getAll();
        },
        setAll(cookiesNuevas) {
          try {
            cookiesNuevas.forEach(({ name, value, options }) =>
              almacenDeCookies.set(name, value, options),
            );
          } catch {
            // Llamado desde un Server Component: el middleware ya refresco la sesion.
          }
        },
      },
    },
  );
}
