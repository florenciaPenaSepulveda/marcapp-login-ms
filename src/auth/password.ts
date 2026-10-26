import * as bcrypt from 'bcrypt';

const COSTO = 12;

export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, COSTO);

export const comparePasswords = (
  password: string,
  hash: string,
): Promise<boolean> => bcrypt.compare(password, hash);

export const HASH_FICTICIO = bcrypt.hashSync('contrasena-ficticia', COSTO);
