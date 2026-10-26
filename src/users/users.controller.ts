import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ChangeRoleDto } from '../dto/change-role.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { LegacySearchDto } from '../dto/legacy-search.dto';
import { crearPayload } from 'src/auth/token';
import { Roles } from 'src/enum/roles.decorator';
import { Role } from 'src/enum/user-type.enum';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { AuthGuard } from 'src/auth/guards/auth.guard';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

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
    const user = await this.usersService.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return {
      message: 'Password updated',
      access_token: await this.jwtService.signAsync(crearPayload(user)),
    };
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.usersService.listUsers(query);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('/all')
  async listUsersLegacy(@Body() { searchTerm }: LegacySearchDto) {
    const { items } = await this.usersService.listUsers({
      search: searchTerm,
      limit: 100,
    });
    return items;
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

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('/:id')
  async deleteUser(@Request() req, @Param('id', ParseIntPipe) id: number) {
    await this.usersService.deleteUser(id, req.user.id);
    return { success: true };
  }
}
