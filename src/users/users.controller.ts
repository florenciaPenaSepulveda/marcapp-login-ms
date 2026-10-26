import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { SearchUsersDto } from '../dto/search-users.dto';
import { ChangeRoleDto } from '../dto/change-role.dto';
import { Roles } from 'src/enum/roles.decorator';
import { Role } from 'src/enum/user-type.enum';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { AuthGuard } from 'src/auth/guards/auth.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('/register')
  createUser(@Body() newUser: CreateUserDto) {
    return this.usersService.createUser(newUser);
  }

  @UseGuards(AuthGuard)
  @Patch()
  modifyUser(@Request() req, @Body() newValues: UpdateUserDto) {
    return this.usersService.updateUser(req.user.id, newValues);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('/admin/role/:id')
  addPrivileges(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() { role }: ChangeRoleDto,
  ) {
    if (req.user.id === id && role !== Role.ADMIN) {
      throw new BadRequestException('You cannot remove your own admin role');
    }
    return this.usersService.addPrivileges(id, role);
  }

  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('/all')
  getUsers(@Body() { searchTerm }: SearchUsersDto) {
    return this.usersService.getUsers(searchTerm);
  }
}
