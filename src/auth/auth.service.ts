import * as nestCommon from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { jwtConstants } from './constant';
import * as jwtDecode from 'jwt-decode';
import * as bcrypt from 'bcrypt';

@nestCommon.Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(
    email: string,
    password: string,
  ): Promise<{ access_token: string }> {
    const user = await this.userService.getUser(email);
    if(!user) {
      return null;
    }
    const isPasswordValid = await this.comparePasswords(password, user.pass);
    if (!isPasswordValid) {
      throw new nestCommon.UnauthorizedException();
    }
    const payload = { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.type};

    return {
      access_token: await this.jwtService.signAsync(payload, {
        secret: jwtConstants.secret,
      }),
    };
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    console.log('pass', password);
    console.log('hash', await bcrypt.hash(password, salt))
    return  bcrypt.hash(password, salt);
  }

  // Método para comparar una contraseña con su hash
  async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
