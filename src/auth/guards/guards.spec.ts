import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './role.guard';
import { UsersService } from 'src/users/users.service';
import { Role } from 'src/enum/user-type.enum';

const contexto = (request: Record<string, unknown>): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  }) as unknown as ExecutionContext;

describe('AuthGuard', () => {
  let jwt: { verifyAsync: jest.Mock };
  let users: { getTokenVersion: jest.Mock };
  let guard: AuthGuard;

  beforeEach(() => {
    jwt = { verifyAsync: jest.fn() };
    users = { getTokenVersion: jest.fn().mockResolvedValue(0) };
    guard = new AuthGuard(
      jwt as unknown as JwtService,
      users as unknown as UsersService,
    );
  });

  it.each([[undefined], ['Basic abc'], ['Bearer'], ['Bearer ']])(
    'rechaza la cabecera %p sin llamar a verify',
    async (cabecera) => {
      const request = { headers: { authorization: cabecera } };
      await expect(guard.canActivate(contexto(request))).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(jwt.verifyAsync).not.toHaveBeenCalled();
    },
  );

  it('rechaza un token inválido o vencido', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    await expect(
      guard.canActivate(
        contexto({ headers: { authorization: 'Bearer malo' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza un token cuya versión de sesión ya no es la vigente', async () => {
    jwt.verifyAsync.mockResolvedValue({ id: 3, role: 'user', v: 0 });
    users.getTokenVersion.mockResolvedValue(1);
    await expect(
      guard.canActivate(
        contexto({ headers: { authorization: 'Bearer viejo' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza un token sin versión o de un usuario eliminado', async () => {
    jwt.verifyAsync.mockResolvedValue({ id: 3, role: 'user' });
    await expect(
      guard.canActivate(
        contexto({ headers: { authorization: 'Bearer legado' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    jwt.verifyAsync.mockResolvedValue({ id: 3, role: 'user', v: 0 });
    users.getTokenVersion.mockResolvedValue(null);
    await expect(
      guard.canActivate(
        contexto({ headers: { authorization: 'Bearer borrado' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('acepta un token válido y deja los datos en la solicitud', async () => {
    jwt.verifyAsync.mockResolvedValue({ id: 3, role: 'user', v: 0 });
    const request: Record<string, unknown> = {
      headers: { authorization: 'bearer bueno' },
    };
    await expect(guard.canActivate(contexto(request))).resolves.toBe(true);
    expect(request.user).toEqual({ id: 3, role: 'user', v: 0 });
    expect(users.getTokenVersion).toHaveBeenCalledWith(3);
    expect(jwt.verifyAsync).toHaveBeenCalledWith('bueno');
  });
});

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let users: { getUserById: jest.Mock };
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    users = { getUserById: jest.fn() };
    guard = new RolesGuard(
      reflector as unknown as Reflector,
      users as unknown as UsersService,
    );
  });

  it('permite el acceso cuando la ruta no exige roles', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    await expect(guard.canActivate(contexto({}))).resolves.toBe(true);
  });

  it('niega el acceso sin sesión', async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    await expect(guard.canActivate(contexto({}))).resolves.toBe(false);
  });

  it('usa el rol actual de la base de datos y no el del token', async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    users.getUserById.mockResolvedValue({ type: Role.USER });
    await expect(
      guard.canActivate(contexto({ user: { id: 1, role: 'admin' } })),
    ).resolves.toBe(false);
    users.getUserById.mockResolvedValue({ type: Role.ADMIN });
    await expect(
      guard.canActivate(contexto({ user: { id: 1, role: 'user' } })),
    ).resolves.toBe(true);
  });

  it('niega el acceso si el usuario fue eliminado', async () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    users.getUserById.mockResolvedValue(null);
    await expect(
      guard.canActivate(contexto({ user: { id: 1 } })),
    ).resolves.toBe(false);
  });
});
