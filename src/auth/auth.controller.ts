import * as nestCommon from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { SingInDto } from 'src/dto/sign-in.dto';

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
  
}
