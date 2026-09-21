'use server';

import { redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/server';

export async function iniciarSesion(_estadoPrevio: string | null, formulario: FormData) {
  const email = String(formulario.get('email') ?? '').trim();
  const password = String(formulario.get('password') ?? '');

  if (!email || !password) return 'Completá mail y contraseña.';

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // Mensaje unico a proposito: no revelamos si el mail existe o no.
  if (error) return 'No pudimos iniciar sesión con esos datos.';

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;

  if (claims?.pocketar_staff !== true) {
    await supabase.auth.signOut();
    return 'Esta cuenta no tiene acceso al backoffice.';
  }

  redirect('/');
}
