import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  NotFoundException,
  ConflictException,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { UpdateUserDto } from '../dto/update-user.dto';
import { Roles } from 'src/enum/roles.decorator';
import { Role } from 'src/enum/user-type.enum';
import { Admin } from 'typeorm';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { AuthGuard } from 'src/auth/guards/auth.guard';

@Controller('users')
export class UsersController {
  authService: any;
  constructor(private usersService: UsersService) {}

  //Para poder ejecutarse el createUser debe recibir una petición Post
  @Post('/register')
  async createUser(@Body() newUser: CreateUserDto): Promise<User> | undefined {
    const user = await this.usersService.getUser(newUser.email);
    console.log(JSON.stringify(user));
    if (!user) {
      return this.usersService.createUser(newUser);
    } else {
      throw new ConflictException('El correo electrónico ya está registrado');
    }
  }

  @Patch('/:id')
  async modifyUser(@Param('id') id: number, @Body() newValues: UpdateUserDto): Promise<User> {
    return this.usersService.updateUser(id, newValues); 
  }


  @Patch('/admin/:id/role')
  async addPrivileges(
    @Param('id') id: number,
    @Body('role') role: Role,) {    
    await this.usersService.addPrivileges(id, role);
  }

  @Post('/all') 
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getUsers(): Promise<User[]> {
    console.log(Role.ADMIN);
    return await this.usersService.getUsers();
  }

  @Get('/obtain/all') 
  async getAll(): Promise<User[]> {
    return await this.usersService.getUsers();
  }

  @Get('/email/:email')
  async getUser(@Param('email') email: string): Promise<User> {
    const user = await this.usersService.getUser(email);
    console.log(email);
    console.log(JSON.stringify(user));
    if (!user) {
      throw new NotFoundException(
        `Usuario con mail ${email} no fue encontrado`,
      );
    }
    return user;
  }
}
