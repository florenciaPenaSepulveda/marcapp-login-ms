import { Body, Controller, Get, Param, Post, Patch, Req } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { User } from './user.entity';

@Controller('users')
export class UsersController {
  authService: any;
  constructor(private usersService: UsersService) {}

  //Para poder ejecutarse el createUser debe recibir una petición Post
  @Post('register')
  createUser(@Body() newUser: CreateUserDto) {
    return this.usersService.createUser(newUser);
  }

  @Get()
  getUsers(): Promise<User[]> {
    return this.usersService.getUsers();
  }

  @Get(':email')
  getUser(@Param() email: string): Promise<User> {
    console.log(email);
    console.log(typeof email);
    return this.usersService.getUser(email);
  }

}

