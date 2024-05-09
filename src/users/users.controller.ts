import { Body, Controller, Get, Param, Post, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { User } from './user.entity';

@Controller('users')
export class UsersController {
  authService: any;
  constructor(private usersService: UsersService) {}

  //Para poder ejecutarse el createUser debe recibir una petición Post
  @Post('register')
  async createUser(@Body() newUser: CreateUserDto): Promise<User> | undefined {
    const user = await this.usersService.getUser(newUser.email);
    if(!user) {
      return this.usersService.createUser(newUser);
    } else {
      throw new ConflictException('El correo electrónico ya está registrado')
    }
  }

  @Get()
  getUsers(): Promise<User[]> {
    console.log(JSON.stringify(this.usersService.getUsers))
    return this.usersService.getUsers();
  }

  @Get(':email')
  async getUser(@Param("email") email: string): Promise<User> {
    const user =  await this.usersService.getUser(email);
    console.log(email);
    console.log(JSON.stringify(user));
    if(!user) {
      throw new NotFoundException(`Usuario con mail ${email} no fue encontrado`)
    }
    return user;
  }

}

