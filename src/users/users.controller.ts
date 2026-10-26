import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ChangeRoleDto } from '../dto/change-role.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
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

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(AuthGuard)
  @Patch('/password')
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    await this.usersService.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Password updated' };
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.usersService.listUsers(query);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/stats')
  getStats() {
    return this.usersService.getStats();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/:id')
  getUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserOrFail(id);
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
}
