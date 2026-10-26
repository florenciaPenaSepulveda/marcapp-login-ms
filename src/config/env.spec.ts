import { origenesPermitidos, validarEntorno } from './env';

const base = { JWT_SECRET: 'x'.repeat(40) };

describe('validarEntorno', () => {
  it('aplica valores por defecto', () => {
    const env = validarEntorno(base);
    expect(env.APP_PORT).toBe(3001);
    expect(env.DB_PORT).toBe(3306);
    expect(env.NODE_ENV).toBe('development');
    expect(env.JWT_EXPIRES_IN).toBe('2h');
  });

  it('convierte los números que llegan como texto', () => {
    expect(
      validarEntorno({ ...base, APP_PORT: '4000', DB_PORT: '3309' }),
    ).toMatchObject({ APP_PORT: 4000, DB_PORT: 3309 });
  });

  it('exige un JWT_SECRET largo', () => {
    expect(() => validarEntorno({ JWT_SECRET: 'corto' })).toThrow(/JWT_SECRET/);
    expect(() => validarEntorno({})).toThrow(/Configuración inválida/);
  });

  it('rechaza un NODE_ENV desconocido', () => {
    expect(() => validarEntorno({ ...base, NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV/,
    );
  });
});

describe('origenesPermitidos', () => {
  it('separa, recorta y descarta vacíos', () => {
    expect(origenesPermitidos(' http://a.cl , http://b.cl ,,')).toEqual([
      'http://a.cl',
      'http://b.cl',
    ]);
    expect(origenesPermitidos('')).toEqual([]);
  });
});
