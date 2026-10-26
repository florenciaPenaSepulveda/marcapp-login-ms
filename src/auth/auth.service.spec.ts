import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { Role } from 'src/enum/user-type.enum';
import * as password from './password';

describe('AuthService', () => {
  const usuario = {
    id: 7,
    email: 'ana@test.cl',
    firstName: 'Ana',
    lastName: 'Pérez',
    birthday: '1995-04-20',
    type: Role.USER,
    pass: 'hash-guardado',
    tokenVersion: 2,
  };
  let users: { getUser: jest.Mock; getUserById: jest.Mock };
  let jwt: { signAsync: jest.Mock };
  let servicio: AuthService;
  let comparar: jest.SpyInstance;

  beforeEach(() => {
    users = { getUser: jest.fn(), getUserById: jest.fn() };
    jwt = { signAsync: jest.fn().mockResolvedValue('token-firmado') };
    servicio = new AuthService(
      users as unknown as UsersService,
      jwt as unknown as JwtService,
    );
    comparar = jest.spyOn(password, 'comparePasswords');
  });

  afterEach(() => jest.restoreAllMocks());

  it('entrega un token con los datos públicos del usuario', async () => {
    users.getUser.mockResolvedValue(usuario);
    comparar.mockResolvedValue(true);
    await expect(servicio.signIn(usuario.email, 'Clave12345')).resolves.toEqual(
      { access_token: 'token-firmado' },
    );
    expect(jwt.signAsync).toHaveBeenCalledWith({
      id: 7,
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@test.cl',
      role: 'user',
      v: 2,
    });
  });

  it('rechaza una contraseña incorrecta', async () => {
    users.getUser.mockResolvedValue(usuario);
    comparar.mockResolvedValue(false);
    await expect(servicio.signIn(usuario.email, 'mala')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('responde igual y compara contra un hash ficticio cuando el usuario no existe', async () => {
    users.getUser.mockResolvedValue(null);
    comparar.mockResolvedValue(false);
    await expect(
      servicio.signIn('nadie@test.cl', 'Clave12345'),
    ).rejects.toThrow('Invalid credentials');
    expect(comparar).toHaveBeenCalledWith('Clave12345', password.HASH_FICTICIO);
  });

  it('nunca acepta a un usuario inexistente aunque la comparación resulte verdadera', async () => {
    users.getUser.mockResolvedValue(null);
    comparar.mockResolvedValue(true);
    await expect(servicio.signIn('nadie@test.cl', 'x')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('devuelve el perfil actualizado sin la contraseña', async () => {
    users.getUserById.mockResolvedValue({ ...usuario, pass: undefined });
    const perfil = await servicio.getProfile(7);
    expect(perfil).toEqual({
      id: 7,
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@test.cl',
      birthday: '1995-04-20',
      role: 'user',
    });
    expect(perfil).not.toHaveProperty('pass');
  });

  it('devuelve la sesión vigente con el rol actual', async () => {
    users.getUserById.mockResolvedValue({ ...usuario, type: Role.ADMIN });
    await expect(servicio.getSession(7)).resolves.toEqual({
      id: 7,
      role: 'admin',
    });
    users.getUserById.mockResolvedValue(null);
    await expect(servicio.getSession(7)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza el perfil de un usuario eliminado', async () => {
    users.getUserById.mockResolvedValue(null);
    await expect(servicio.getProfile(99)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

describe('password', () => {
  it('genera hashes distintos y verificables', async () => {
    const a = await password.hashPassword('Clave12345');
    const b = await password.hashPassword('Clave12345');
    expect(a).not.toBe(b);
    expect(await password.comparePasswords('Clave12345', a)).toBe(true);
    expect(await password.comparePasswords('otra', a)).toBe(false);
  });
});
