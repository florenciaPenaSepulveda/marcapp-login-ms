import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { SingInDto } from 'src/dto/sign-in.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  singIn(@Body() signInDto: SingInDto) {
    return this.authService.signIn(signInDto.email, signInDto.pass);
  }

  @SkipThrottle()
  @UseGuards(AuthGuard)
  @Get('session')
  getSession(@Request() req) {
    return this.authService.getSession(req.user.id);
  }

  @UseGuards(AuthGuard)
  @Post('profile')
  getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }
}
