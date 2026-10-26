import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { Role } from 'src/enum/user-type.enum';
import { comparePasswords, hashPassword } from 'src/auth/password';

const CORREO_EN_USO = 'Email already registered';

const esDuplicado = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: string }).code === 'ER_DUP_ENTRY';

const escaparLike = (texto: string): string => texto.replace(/[\\%_]/g, '\\$&');

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    const pass = await hashPassword(dto.pass);
    try {
      const saved = await this.userRepository.save(
        this.userRepository.create({ ...dto, pass }),
      );
      return await this.getUserById(saved.id);
    } catch (error) {
      if (esDuplicado(error)) {
        throw new ConflictException(CORREO_EN_USO);
      }
      throw error;
    }
  }

  async createAdmin(dto: CreateUserDto): Promise<User> {
    const user = await this.createUser(dto);
    return this.addPrivileges(user.id, Role.ADMIN);
  }

  async listUsers({ search, role, limit = 20, offset = 0 }: ListUsersQueryDto) {
    const consulta = this.userRepository
      .createQueryBuilder('user')
      .orderBy('user.firstName', 'ASC')
      .addOrderBy('user.lastName', 'ASC')
      .addOrderBy('user.id', 'ASC')
      .take(limit)
      .skip(offset);
    if (role) {
      consulta.andWhere('user.type = :role', { role });
    }
    if (search) {
      const termino = `%${escaparLike(search)}%`;
      consulta.andWhere(
        new Brackets((grupo) =>
          grupo
            .where('user.firstName LIKE :termino', { termino })
            .orWhere('user.lastName LIKE :termino', { termino })
            .orWhere('user.email LIKE :termino', { termino }),
        ),
      );
    }
    const [items, total] = await consulta.getManyAndCount();
    return { items, total, limit, offset };
  }

  getUser(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        birthday: true,
        type: true,
        pass: true,
        tokenVersion: true,
      },
    });
  }

  getUserById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async getTokenVersion(id: number): Promise<number | null> {
    if (!Number.isInteger(id)) {
      return null;
    }
    const user = await this.userRepository.findOne({
      where: { id },
      select: { id: true, tokenVersion: true },
    });
    return user ? user.tokenVersion : null;
  }

  async getUserOrFail(id: number): Promise<User> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  countAdmins(): Promise<number> {
    return this.userRepository.count({ where: { type: Role.ADMIN } });
  }

  async getStats() {
    const inicioDeMes = new Date();
    inicioDeMes.setDate(1);
    inicioDeMes.setHours(0, 0, 0, 0);
    const [total, admins, newThisMonth] = await Promise.all([
      this.userRepository.count(),
      this.countAdmins(),
      this.userRepository
        .createQueryBuilder('user')
        .where('user.createdAt >= :inicioDeMes', { inicioDeMes })
        .getCount(),
    ]);
    return { total, admins, workers: total - admins, newThisMonth };
  }

  async updateUser(id: number, dto: UpdateUserDto): Promise<User> {
    await this.getUserOrFail(id);
    try {
      if (Object.keys(dto).length > 0) {
        await this.userRepository.update(id, dto);
      }
    } catch (error) {
      if (esDuplicado(error)) {
        throw new ConflictException(CORREO_EN_USO);
      }
      throw error;
    }
    return this.getUserById(id);
  }

  async changePassword(
    id: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        birthday: true,
        type: true,
        pass: true,
        tokenVersion: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!(await comparePasswords(currentPassword, user.pass))) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (currentPassword === newPassword) {
      throw new BadRequestException('The new password must be different');
    }
    const tokenVersion = user.tokenVersion + 1;
    await this.userRepository.update(id, {
      pass: await hashPassword(newPassword),
      tokenVersion,
    });
    return { ...user, tokenVersion };
  }

  async deleteUser(id: number, actorId: number): Promise<void> {
    if (id === actorId) {
      throw new BadRequestException('You cannot delete your own account');
    }
    const user = await this.getUserOrFail(id);
    if (user.type === Role.ADMIN && (await this.countAdmins()) <= 1) {
      throw new BadRequestException('You cannot delete the last administrator');
    }
    await this.userRepository.delete(id);
  }

  async addPrivileges(id: number, role: Role): Promise<User> {
    await this.getUserOrFail(id);
    await this.userRepository.update(id, { type: role });
    return this.getUserById(id);
  }
}
