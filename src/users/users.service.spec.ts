import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { Role } from 'src/enum/user-type.enum';
import { comparePasswords } from 'src/auth/password';

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
  let consulta: { orderBy: jest.Mock; where: jest.Mock; getMany: jest.Mock };
  let servicio: UsersService;

  beforeEach(() => {
    consulta = {
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
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

  it('lista sin filtro y con filtro escapando los comodines', async () => {
    await servicio.getUsers();
    expect(consulta.where).not.toHaveBeenCalled();
    await servicio.getUsers('50%_a');
    expect(consulta.where).toHaveBeenCalledWith(
      expect.stringContaining('LIKE :termino'),
      { termino: '%50\\%\\_a%' },
    );
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
