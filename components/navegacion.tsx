'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const enlaces = [
  { href: '/', texto: 'Inicio' },
  { href: '/revision', texto: 'Revisión' },
  { href: '/publicaciones', texto: 'Publicaciones' },
];

export function Navegacion() {
  const pathname = usePathname();
  if (pathname.startsWith('/login') || pathname.startsWith('/auth')) return null;

  return (
    <header className="barra">
      <Link href="/" className="marca">Pocketar <span>staff</span></Link>
      <nav aria-label="Navegación principal">
        {enlaces.map((enlace) => (
          <Link key={enlace.href} href={enlace.href} className={pathname === enlace.href || (enlace.href !== '/' && pathname.startsWith(enlace.href)) ? 'activo' : ''}>
            {enlace.texto}
          </Link>
        ))}
      </nav>
      <form action="/auth/signout" method="post"><button className="salir" type="submit">Cerrar sesión</button></form>
    </header>
  );
}
