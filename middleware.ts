import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const RUTAS_PUBLICAS = ['/login', '/auth'];

/**
 * Primera de las tres barreras (spec seccion 3.3).
 * Sin sesion valida o sin el claim de staff, ninguna ruta se sirve.
 *
 * MFA: D-61 lo difiere. El gancho de aal2 queda escrito y apagado tras
 * BACKOFFICE_EXIGIR_MFA. Encenderlo mas adelante es cambiar esa variable.
 */
export async function middleware(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesNuevas) {
          cookiesNuevas.forEach(({ name, value }) => request.cookies.set(name, value));
          respuesta = NextResponse.next({ request });
          cookiesNuevas.forEach(({ name, value, options }) =>
            respuesta.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;

  const esRutaPublica = RUTAS_PUBLICAS.some((ruta) =>
    request.nextUrl.pathname.startsWith(ruta),
  );

  if (esRutaPublica) return respuesta;

  if (!claims) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Una cuenta de usuario comun autenticada en Supabase no entra aca.
  if (claims.pocketar_staff !== true) {
    return new NextResponse('No autorizado', { status: 403 });
  }

  if (process.env.BACKOFFICE_EXIGIR_MFA === 'true' && claims.aal !== 'aal2') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('motivo', 'mfa');
    return NextResponse.redirect(url);
  }

  return respuesta;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
