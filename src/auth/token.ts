import { User } from 'src/users/user.entity';

export interface TokenPayload {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  v: number;
}

export const crearPayload = (user: User): TokenPayload => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.type,
  v: user.tokenVersion,
});
