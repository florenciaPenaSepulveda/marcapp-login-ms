import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';
import { SingInDto } from './sign-in.dto';
import { ChangeRoleDto } from './change-role.dto';
import { SearchUsersDto } from './search-users.dto';
import { esFechaNacimientoValida } from './birthday.validator';

const errores = async (
  clase: new () => object,
  datos: Record<string, unknown>,
) => (await validate(plainToInstance(clase, datos))).map((e) => e.property);

const valido = {
  email: 'Ana@Test.cl ',
  firstName: ' Ana ',
  lastName: 'Pérez-Núñez',
  pass: 'Clave12345!',
  birthday: '1995-04-20',
};

describe('CreateUserDto', () => {
  it('acepta datos válidos y los normaliza', async () => {
    const dto = plainToInstance(CreateUserDto, valido);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.email).toBe('ana@test.cl');
    expect(dto.firstName).toBe('Ana');
  });

  it.each([
    ['email', 'no-es-correo'],
    ['firstName', 'A'],
    ['firstName', 'Ana123'],
    ['lastName', ''],
    ['pass', 'corta1'],
    ['pass', 'soloLetrasLargas'],
    ['pass', '1234567890'],
    ['pass', 'a1'.repeat(40)],
    ['birthday', '2999-01-01'],
    ['birthday', '1995-02-30'],
    ['birthday', '20/04/1995'],
  ])('rechaza %s = %s', async (campo, valor) => {
    expect(
      await errores(CreateUserDto, { ...valido, [campo]: valor }),
    ).toContain(campo);
  });

  it('acepta símbolos en la contraseña y nombres con tilde o apóstrofe', async () => {
    expect(
      await errores(CreateUserDto, {
        ...valido,
        pass: 'Clave#2024-ñandú',
        firstName: "D'Angelo",
      }),
    ).toEqual([]);
  });
});

describe('UpdateUserDto', () => {
  it('permite enviar solo algunos campos', async () => {
    expect(await errores(UpdateUserDto, {})).toEqual([]);
    expect(await errores(UpdateUserDto, { firstName: 'Luz' })).toEqual([]);
  });

  it('valida los campos enviados', async () => {
    expect(
      await errores(UpdateUserDto, {
        email: 'mal',
        birthday: '2999-01-01',
        firstName: '1',
      }),
    ).toEqual(expect.arrayContaining(['email', 'birthday', 'firstName']));
  });
});

describe('SingInDto', () => {
  it('no impone la política de contraseña al ingresar', async () => {
    expect(
      await errores(SingInDto, { email: 'ana@test.cl', pass: 'x' }),
    ).toEqual([]);
  });

  it('rechaza correo inválido, contraseña vacía o demasiado larga', async () => {
    expect(await errores(SingInDto, { email: 'x', pass: '' })).toEqual(
      expect.arrayContaining(['email', 'pass']),
    );
    expect(
      await errores(SingInDto, { email: 'ana@test.cl', pass: 'a'.repeat(73) }),
    ).toEqual(['pass']);
  });
});

describe('ChangeRoleDto y SearchUsersDto', () => {
  it('solo admite roles conocidos', async () => {
    expect(await errores(ChangeRoleDto, { role: 'admin' })).toEqual([]);
    expect(await errores(ChangeRoleDto, { role: 'root' })).toEqual(['role']);
  });

  it('el término de búsqueda es opcional y acotado', async () => {
    expect(await errores(SearchUsersDto, {})).toEqual([]);
    expect(
      await errores(SearchUsersDto, { searchTerm: 'a'.repeat(61) }),
    ).toEqual(['searchTerm']);
  });
});

describe('esFechaNacimientoValida', () => {
  const hoy = new Date('2026-10-26T12:00:00Z');

  it('acepta fechas reales y pasadas, incluido hoy', () => {
    expect(esFechaNacimientoValida('2000-02-29', hoy)).toBe(true);
    expect(esFechaNacimientoValida('2026-10-26', hoy)).toBe(true);
  });

  it('rechaza futuras, inexistentes, antiguas y de otro tipo', () => {
    expect(esFechaNacimientoValida('2026-10-27', hoy)).toBe(false);
    expect(esFechaNacimientoValida('2001-02-29', hoy)).toBe(false);
    expect(esFechaNacimientoValida('1899-12-31', hoy)).toBe(false);
    expect(esFechaNacimientoValida(19950420, hoy)).toBe(false);
  });
});
