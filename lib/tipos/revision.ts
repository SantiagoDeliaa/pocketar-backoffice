export type MotivoRechazo = {
  codigo: string;
  texto_usuario: string;
  orden: number;
};

export type MiembroRevision = {
  user_id: string;
  nombre: string;
};

export type CatalogoRevision = {
  motivos: MotivoRechazo[];
  miembros: MiembroRevision[];
};
