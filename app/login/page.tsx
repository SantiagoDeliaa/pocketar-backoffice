'use client';

import { useActionState } from 'react';
import { iniciarSesion } from './actions';

export default function Login() {
  const [error, accion, pendiente] = useActionState(iniciarSesion, null);

  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', padding: 16 }}>
      <form
        action={accion}
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'var(--navy-elevado)',
          border: '1px solid var(--borde)',
          borderRadius: 16,
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 20, marginTop: 0 }}>Backoffice</h1>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="email">Mail</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        <button type="submit" disabled={pendiente} style={{ width: '100%' }}>
          {pendiente ? 'Entrando…' : 'Entrar'}
        </button>

        {error && (
          <p role="alert" style={{ color: 'var(--alerta)', fontSize: 14 }}>
            {error}
          </p>
        )}
      </form>
    </main>
  );
}
