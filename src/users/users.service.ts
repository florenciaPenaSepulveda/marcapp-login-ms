import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../dto/create-user.dto';
import { Role } from 'src/enum/user-type.enum';
//BIBLIOTECA QUE SE COMUNICA CON LA BASE DE DATOS PARA HACER OPERACIONES
//Se hace la operación primero en Services, y luego la solicitud http en controller
@Injectable()
export class UsersService {
  cambiarContraseña(idUsuario: number, nuevaContrasena: string) {
    throw new Error('Method not implemented.');
  }
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}


  async addPrivileges(id: number, role: Role) {
    await this.userRepository.update(id, {type: role})
  }

  createUser(user: CreateUserDto) {
    const newUser = this.userRepository.create(user);
    return this.userRepository.save(newUser);
  }

  getUsers() {
    return this.userRepository.find();
  }

  getUser(email: string) {
    return this.userRepository.findOne({
      where: {
        email: email,
      },
    });
  }

  async getUserById(id: number) {
    return this.userRepository.findOne({
      where: {
        id: id,
      },
    });
  }
}
