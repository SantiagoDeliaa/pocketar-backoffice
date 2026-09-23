import { crearClienteServidor } from '@/lib/supabase/server';

export type SesionStaff = {
  userId: string;
  email: string | null;
};

/**
 * Revalida que quien llama sea staff. Segunda barrera de las tres de la seccion 3.3
 * del spec: el middleware ya filtro, pero un miembro revocado hace cinco minutos
 * todavia porta un JWT valido, asi que cada Server Action vuelve a chequear.
 *
 * La tercera barrera —la real— es staff.es_staff() adentro de cada RPC.
 */
export async function exigirStaff(): Promise<SesionStaff> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    throw new Error('NO_AUTENTICADO');
  }

  const claims = data.claims as Record<string, unknown>;
  if (claims.pocketar_staff !== true) {
    throw new Error('NO_ES_STAFF');
  }

  const { data: sesionActiva, error: errorSesionActiva } = await supabase.rpc(
    'fn_staff_sesion_activa',
  );
  if (errorSesionActiva || sesionActiva !== true) {
    throw new Error('NO_ES_STAFF');
  }

  return {
    userId: String(claims.sub),
    email: typeof claims.email === 'string' ? claims.email : null,
  };
}
