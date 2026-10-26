import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { comparePasswords, HASH_FICTICIO } from './password';
import { crearPayload } from './token';

@Injectable()
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
    const valida = await comparePasswords(
      password,
      user?.pass ?? HASH_FICTICIO,
    );
    if (!user || !valida) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return {
      access_token: await this.jwtService.signAsync(crearPayload(user)),
    };
  }

  async getProfile(id: number) {
    const user = await this.userService.getUserById(id);
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      birthday: user.birthday,
      role: user.type,
    };
  }

  async getSession(id: number) {
    const user = await this.userService.getUserById(id);
    if (!user) {
      throw new UnauthorizedException();
    }
    return { id: user.id, role: user.type };
  }
}
