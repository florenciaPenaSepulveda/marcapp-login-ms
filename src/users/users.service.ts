import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
//BIBLIOTECA QUE SE COMUNICA CON LA BASE DE DATOS PARA HACER OPERACIONES
//Se hace la operación primero en Services, y luego la solicitud http en controller
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  createUser(user: CreateUserDto) {
    const newUser = this.userRepository.create(user);
    return this.userRepository.save(newUser);
  }
  //Compara lo que espera el repositorio (user.entity) con lo que esperamos recibir dto

  getUsers() {
    return this.userRepository.find();
  }

  getUser(email: string) {
    return this.userRepository.findOne({
      where: {
        email,
      },
    });
  }
}
