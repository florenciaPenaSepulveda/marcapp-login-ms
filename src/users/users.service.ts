import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { Role } from 'src/enum/user-type.enum';
import { hashPassword } from 'src/auth/password';

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

  getUsers(searchTerm?: string): Promise<User[]> {
    const consulta = this.userRepository
      .createQueryBuilder('user')
      .orderBy('user.id', 'ASC');
    if (searchTerm) {
      consulta.where(
        '(user.firstName LIKE :termino OR user.lastName LIKE :termino OR user.email LIKE :termino)',
        { termino: `%${escaparLike(searchTerm)}%` },
      );
    }
    return consulta.getMany();
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
      },
    });
  }

  getUserById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  countAdmins(): Promise<number> {
    return this.userRepository.count({ where: { type: Role.ADMIN } });
  }

  async updateUser(id: number, dto: UpdateUserDto): Promise<User> {
    if (!(await this.getUserById(id))) {
      throw new NotFoundException('User not found');
    }
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

  async addPrivileges(id: number, role: Role): Promise<User> {
    if (!(await this.getUserById(id))) {
      throw new NotFoundException('User not found');
    }
    await this.userRepository.update(id, { type: role });
    return this.getUserById(id);
  }
}
