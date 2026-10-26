import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';
import { SingInDto } from './sign-in.dto';
import { ChangeRoleDto } from './change-role.dto';
import { ListUsersQueryDto } from './list-users-query.dto';
import { ChangePasswordDto } from './change-password.dto';
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

describe('ChangeRoleDto', () => {
  it('solo admite roles conocidos', async () => {
    expect(await errores(ChangeRoleDto, { role: 'admin' })).toEqual([]);
    expect(await errores(ChangeRoleDto, { role: 'root' })).toEqual(['role']);
  });
});

describe('ListUsersQueryDto', () => {
  it('todos los parámetros son opcionales y se convierten a número', async () => {
    expect(await errores(ListUsersQueryDto, {})).toEqual([]);
    const consulta = plainToInstance(ListUsersQueryDto, {
      limit: '10',
      offset: '5',
      search: '  ana ',
      role: 'user',
    });
    expect(consulta).toMatchObject({
      limit: 10,
      offset: 5,
      search: 'ana',
      role: 'user',
    });
    expect(await validate(consulta)).toHaveLength(0);
  });

  it.each([
    ['limit', '0'],
    ['limit', '101'],
    ['offset', '-1'],
    ['role', 'root'],
    ['search', 'a'.repeat(61)],
  ])('rechaza %s = %s', async (campo, valor) => {
    expect(await errores(ListUsersQueryDto, { [campo]: valor })).toEqual([
      campo,
    ]);
  });
});

describe('ChangePasswordDto', () => {
  it('exige la clave actual y una nueva clave válida', async () => {
    expect(
      await errores(ChangePasswordDto, {
        currentPassword: 'x',
        newPassword: 'Nueva12345',
      }),
    ).toEqual([]);
    expect(
      await errores(ChangePasswordDto, {
        currentPassword: '',
        newPassword: 'corta',
      }),
    ).toEqual(['currentPassword', 'newPassword']);
    expect(
      await errores(ChangePasswordDto, {
        currentPassword: 'x',
        newPassword: 'soloLetrasLargas',
      }),
    ).toEqual(['newPassword']);
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
