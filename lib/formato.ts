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

/** «3 d 4 h» / «5 h» / «Menos de 1 h». Para antigüedades que vienen en horas. */
export function antiguedad(horas: number | null | undefined) {
  if (horas === null || horas === undefined || Number.isNaN(horas)) return '—';
  const total = Math.floor(horas);
  if (total < 1) return 'Menos de 1 h';
  if (total < 24) return `${total} h`;
  const dias = Math.floor(total / 24);
  const resto = total % 24;
  return resto === 0 ? `${dias} d` : `${dias} d ${resto} h`;
}

export function fecha(valor: string | null) {
  if (!valor) return '—';
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor));
}
