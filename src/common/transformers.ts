export const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export const normalizarCorreo = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
