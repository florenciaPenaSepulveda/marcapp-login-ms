import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { User } from './user.entity';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  //Para poder ejecutarse el createUser debe recibir una petición Post
  @Post('register')
  createUser(@Body() newUser: CreateUserDto): Promise<User> {
    return this.usersService.createUser(newUser);
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
