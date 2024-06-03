import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private userService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    console.log('roles:', requiredRoles);
    const request = context.switchToHttp().getRequest();

    if(request?.user) {
      const {id} = request.user;
      console.log('Usuario en role',request.user);
      const user = await this.userService.getUserById(id);
      
      return requiredRoles.includes(user.type);
      
    }

    return false;
  }
}