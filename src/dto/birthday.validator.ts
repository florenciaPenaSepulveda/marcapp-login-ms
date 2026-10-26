import { registerDecorator, ValidationOptions } from 'class-validator';

const FORMATO = /^(\d{4})-(\d{2})-(\d{2})$/;
const ANIO_MINIMO = 1900;

export const esFechaNacimientoValida = (
  valor: unknown,
  hoy: Date = new Date(),
): boolean => {
  if (typeof valor !== 'string') {
    return false;
  }
  const partes = FORMATO.exec(valor);
  if (!partes) {
    return false;
  }
  const [anio, mes, dia] = partes.slice(1).map(Number);
  if (anio < ANIO_MINIMO) {
    return false;
  }
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  const existe =
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia;
  const limite = Date.UTC(
    hoy.getUTCFullYear(),
    hoy.getUTCMonth(),
    hoy.getUTCDate(),
  );
  return existe && fecha.getTime() <= limite;
};

export const IsBirthday =
  (opciones?: ValidationOptions) => (objeto: object, propiedad: string) =>
    registerDecorator({
      name: 'isBirthday',
      target: objeto.constructor,
      propertyName: propiedad,
      options: {
        message: 'Birthday must be a valid past date in the format YYYY-MM-DD',
        ...opciones,
      },
      validator: {
        validate: (valor: unknown) => esFechaNacimientoValida(valor),
      },
    });
