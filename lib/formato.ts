export function tiempoSla(desde: string | null) {
  if (!desde) return { texto: 'Sin fecha', estado: 'normal' as const };
  const restante = new Date(desde).getTime() + 48 * 60 * 60 * 1000 - Date.now();
  const horas = Math.ceil(Math.abs(restante) / (60 * 60 * 1000));
  if (restante < 0) return { texto: `Vencido hace ${horas} h`, estado: 'vencido' as const };
  if (restante <= 6 * 60 * 60 * 1000) return { texto: `${horas} h restantes`, estado: 'urgente' as const };
  return { texto: `${horas} h restantes`, estado: 'normal' as const };
}

export function moneda(valor: number | null, divisa: string | null) {
  if (valor === null) return '—';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: divisa || 'ARS',
    maximumFractionDigits: 0,
  }).format(valor);
}

export function fecha(valor: string | null) {
  if (!valor) return '—';
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor));
}
