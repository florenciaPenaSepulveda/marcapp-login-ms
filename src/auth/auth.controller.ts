import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { SingInDto } from 'src/dto/sign-in.dto';
import { JwtPayload } from 'jwt-decode';
import { RolesGuard } from './guards/role.guard';
import { Roles } from 'src/enum/roles.decorator';
import { Role } from 'src/enum/user-type.enum';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async singIn(@Body() signInDto: SingInDto) {
    const token = await this.authService.signIn(
      signInDto.email,
      signInDto.pass,
    );
    console.log(token);
    return token;
  }

  @UseGuards(AuthGuard)
  @Post('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin/role')
  isAdmin(@Request() req) {
    console.log(req.user);
    return true;
  }
  
  @Get(':t')
  async verToken(@Param('t') t: string): Promise<Boolean> {
    return this.authService.verifyToken(t);
  }

  @Post(':t')
  getId(@Param('t') t: string): String {
    return this.authService.decodeToken(t);
  }
  
}
