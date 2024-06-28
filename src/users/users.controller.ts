import * as nestCommon from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { UpdateUserDto } from '../dto/update-user.dto';
import { Roles } from 'src/enum/roles.decorator';
import { Role } from 'src/enum/user-type.enum';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { AuthService } from 'src/auth/auth.service';

@nestCommon.Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private readonly authService: AuthService) {}

  //Para poder ejecutarse el createUser debe recibir una petición Post
  @nestCommon.Post('/register')
  @nestCommon.UsePipes(new nestCommon.ValidationPipe())
  async createUser(@nestCommon.Body() newUser: CreateUserDto): Promise<User> | undefined {
    const user = await this.usersService.getUser(newUser.email);
    if (!user) {
      const hashedPassword = await this.authService.hashPassword(newUser.pass);
      newUser.pass = hashedPassword;
      return await this.usersService.createUser(newUser);
    } else {
      throw new nestCommon.ConflictException('El correo electrónico ya está registrado');
    }
  }

  @nestCommon.UseGuards(AuthGuard)
  @nestCommon.UsePipes(new nestCommon.ValidationPipe())
  @nestCommon.Patch()
  async modifyUser(@nestCommon.Request() req, @nestCommon.Body() newValues: UpdateUserDto): Promise<User> {
    console.log(req.user.id);
    return this.usersService.updateUser(req.user.id, newValues); 
  }

  //ENDPOINT SOLO UTILIZABLE EN POSTMAN, CREA ADMIN
  @nestCommon.Patch('/admin/role/:id')
  async addPrivileges(
    @nestCommon.Param('id') id: number,
    @nestCommon.Body('role') role: Role,) {    
    await this.usersService.addPrivileges(id, role);
  }

  @nestCommon.Post('/all') 
  @nestCommon.UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getUsers(): Promise<User[]> {
    console.log(Role.ADMIN);
    return await this.usersService.getUsers();
  }

  //Endpoint para utilizar en POSTMAN, no se utiliza en la aplicación.
  @nestCommon.Get('/obtain/all') 
  async getAll(): Promise<User[]> {
    return await this.usersService.getUsers();
  }

  @nestCommon.Get('/email/:email')
  async getUser(@nestCommon.Param('email') email: string): Promise<User> {
    const user = await this.usersService.getUser(email);
    console.log(email);
    console.log(JSON.stringify(user));
    if (!user) {
      throw new nestCommon.NotFoundException(
        `Usuario con mail ${email} no fue encontrado`,
      );
    }
    return user;
  }
}
