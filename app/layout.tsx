import type { Metadata } from 'next';
import './globals.css';
import { Navegacion } from '@/components/navegacion';

export const metadata: Metadata = {
  title: 'Backoffice · Pocketar',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body><Navegacion />{children}</body>
    </html>
  );
}
