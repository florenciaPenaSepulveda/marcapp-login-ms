import * as nestCommon from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { SingInDto } from 'src/dto/sign-in.dto';
import { RolesGuard } from './guards/role.guard';
import { Roles } from 'src/enum/roles.decorator';
import { Role } from 'src/enum/user-type.enum';

@nestCommon.Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @nestCommon.HttpCode(nestCommon.HttpStatus.OK)
  @nestCommon.Post('login')
  @nestCommon.UsePipes(new nestCommon.ValidationPipe())
  async singIn(@nestCommon.Body() signInDto: SingInDto) {
    const token = await this.authService.signIn(
      signInDto.email,
      signInDto.pass,
    );
    console.log(token);
    return token;
  }

  @nestCommon.UseGuards(AuthGuard)
  @nestCommon.Post('profile')
  getProfile(@nestCommon.Request() req) {
    return req.user;
  }

  @nestCommon.UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @nestCommon.Post('admin/role')
  isAdmin(@nestCommon.Request() req) {
    console.log(req.user);
    return true;
  }
  
  @nestCommon.Get(':t')
  async verToken(@nestCommon.Param('t') t: string): Promise<Boolean> {
    return this.authService.verifyToken(t);
  }

  @nestCommon.Post(':t')
  getId(@nestCommon.Param('t') t: string): String {
    return this.authService.decodeToken(t);
  }
  
}
