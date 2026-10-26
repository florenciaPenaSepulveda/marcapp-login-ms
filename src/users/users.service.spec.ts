import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Role } from 'src/enum/user-type.enum';
import { comparePasswords, hashPassword } from 'src/auth/password';

const dto = {
  email: 'ana@test.cl',
  firstName: 'Ana',
  lastName: 'Pérez',
  pass: 'Clave12345',
  birthday: '1995-04-20',
};

describe('UsersService', () => {
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    findOne: jest.Mock;
    count: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let consulta: {
    orderBy: jest.Mock;
    addOrderBy: jest.Mock;
    take: jest.Mock;
    skip: jest.Mock;
    andWhere: jest.Mock;
    where: jest.Mock;
    getManyAndCount: jest.Mock;
    getCount: jest.Mock;
  };
  let servicio: UsersService;

  beforeEach(() => {
    consulta = {
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getCount: jest.fn().mockResolvedValue(0),
    };
    repo = {
      create: jest.fn((datos) => datos),
      save: jest.fn(async (datos) => ({ id: 5, ...datos })),
      update: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => consulta),
    };
    servicio = new UsersService(repo as never);
  });

  it('guarda la contraseña como hash y devuelve el usuario sin ella', async () => {
    repo.findOne.mockResolvedValue({ id: 5, email: dto.email });
    await servicio.createUser(dto);
    const guardado = repo.create.mock.calls[0][0];
    expect(guardado.pass).not.toBe(dto.pass);
    expect(await comparePasswords(dto.pass, guardado.pass)).toBe(true);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 5 } });
  });

  it('traduce el correo duplicado en un conflicto', async () => {
    repo.save.mockRejectedValue({ code: 'ER_DUP_ENTRY' });
    await expect(servicio.createUser(dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('propaga los demás errores de la base de datos', async () => {
    repo.save.mockRejectedValue(new Error('conexión perdida'));
    await expect(servicio.createUser(dto)).rejects.toThrow('conexión perdida');
  });

  it('crea administradores asignando el rol después de registrar', async () => {
    repo.findOne.mockResolvedValue({ id: 5 });
    await servicio.createAdmin(dto);
    expect(repo.update).toHaveBeenCalledWith(5, { type: Role.ADMIN });
  });

  describe('listUsers', () => {
    it('pagina con valores por defecto y devuelve el total', async () => {
      consulta.getManyAndCount.mockResolvedValue([[{ id: 1 }], 41]);
      const res = await servicio.listUsers({});
      expect(res).toEqual({
        items: [{ id: 1 }],
        total: 41,
        limit: 20,
        offset: 0,
      });
      expect(consulta.take).toHaveBeenCalledWith(20);
      expect(consulta.skip).toHaveBeenCalledWith(0);
      expect(consulta.andWhere).not.toHaveBeenCalled();
    });

    it('filtra por rol y por texto escapando los comodines', async () => {
      await servicio.listUsers({
        role: Role.ADMIN,
        search: '50%_a',
        limit: 5,
        offset: 10,
      });
      expect(consulta.andWhere).toHaveBeenCalledWith('user.type = :role', {
        role: Role.ADMIN,
      });
      const grupo = consulta.andWhere.mock.calls[1][0];
      const termino: string[] = [];
      const constructor = {
        where: jest.fn((_sql, parametros) => {
          termino.push(parametros.termino);
          return constructor;
        }),
        orWhere: jest.fn((_sql, parametros) => {
          termino.push(parametros.termino);
          return constructor;
        }),
      };
      grupo.whereFactory(constructor);
      expect(termino).toEqual(['%50\\%\\_a%', '%50\\%\\_a%', '%50\\%\\_a%']);
      expect(consulta.take).toHaveBeenCalledWith(5);
      expect(consulta.skip).toHaveBeenCalledWith(10);
    });
  });

  it('getUserOrFail falla si el usuario no existe', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(servicio.getUserOrFail(3)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    repo.findOne.mockResolvedValue({ id: 3 });
    await expect(servicio.getUserOrFail(3)).resolves.toEqual({ id: 3 });
  });

  it('calcula las estadísticas de usuarios', async () => {
    repo.count.mockResolvedValueOnce(10).mockResolvedValueOnce(2);
    consulta.getCount.mockResolvedValue(3);
    await expect(servicio.getStats()).resolves.toEqual({
      total: 10,
      admins: 2,
      workers: 8,
      newThisMonth: 3,
    });
  });

  describe('changePassword', () => {
    it('falla si el usuario no existe', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(servicio.changePassword(1, 'a', 'b')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('exige la contraseña actual correcta', async () => {
      repo.findOne.mockResolvedValue({
        id: 1,
        pass: await hashPassword('Actual12345'),
      });
      await expect(
        servicio.changePassword(1, 'Otra12345', 'Nueva12345'),
      ).rejects.toThrow('Current password is incorrect');
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('rechaza una nueva contraseña igual a la actual', async () => {
      repo.findOne.mockResolvedValue({
        id: 1,
        pass: await hashPassword('Actual12345'),
      });
      await expect(
        servicio.changePassword(1, 'Actual12345', 'Actual12345'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('guarda la nueva contraseña como hash', async () => {
      repo.findOne.mockResolvedValue({
        id: 1,
        pass: await hashPassword('Actual12345'),
      });
      await servicio.changePassword(1, 'Actual12345', 'Nueva12345');
      const { pass } = repo.update.mock.calls[0][1];
      expect(pass).not.toBe('Nueva12345');
      expect(await comparePasswords('Nueva12345', pass)).toBe(true);
    });
  });

  it('busca por correo incluyendo el hash solo para el ingreso', async () => {
    await servicio.getUser('ana@test.cl');
    expect(repo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'ana@test.cl' },
        select: expect.objectContaining({ pass: true }),
      }),
    );
  });

  it('cuenta administradores', async () => {
    repo.count.mockResolvedValue(2);
    await expect(servicio.countAdmins()).resolves.toBe(2);
    expect(repo.count).toHaveBeenCalledWith({ where: { type: Role.ADMIN } });
  });

  describe('updateUser', () => {
    it('falla si el usuario no existe', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        servicio.updateUser(9, { firstName: 'Luz' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('actualiza solo cuando hay campos', async () => {
      repo.findOne.mockResolvedValue({ id: 9 });
      await servicio.updateUser(9, {});
      expect(repo.update).not.toHaveBeenCalled();
      await servicio.updateUser(9, { firstName: 'Luz' });
      expect(repo.update).toHaveBeenCalledWith(9, { firstName: 'Luz' });
    });

    it('informa el correo duplicado', async () => {
      repo.findOne.mockResolvedValue({ id: 9 });
      repo.update.mockRejectedValue({ code: 'ER_DUP_ENTRY' });
      await expect(
        servicio.updateUser(9, { email: 'otra@test.cl' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('propaga errores inesperados', async () => {
      repo.findOne.mockResolvedValue({ id: 9 });
      repo.update.mockRejectedValue(new Error('fallo'));
      await expect(
        servicio.updateUser(9, { firstName: 'Luz' }),
      ).rejects.toThrow('fallo');
    });
  });

  describe('addPrivileges', () => {
    it('falla si el usuario no existe', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        servicio.addPrivileges(9, Role.ADMIN),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('cambia el rol', async () => {
      repo.findOne.mockResolvedValue({ id: 9 });
      await servicio.addPrivileges(9, Role.ADMIN);
      expect(repo.update).toHaveBeenCalledWith(9, { type: Role.ADMIN });
    });
  });
});
