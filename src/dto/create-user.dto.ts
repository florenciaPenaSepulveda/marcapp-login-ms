import { Transform } from 'class-transformer';
import * as validator from 'class-validator';
import { normalizarCorreo, recortar } from 'src/common/transformers';
import { IsBirthday } from './birthday.validator';

export const NOMBRE = /^\p{L}+(?:[ '-]\p{L}+)*$/u;
export const CLAVE_CON_LETRA_Y_NUMERO = /^(?=.*\p{L})(?=.*\d).+$/u;

export class CreateUserDto {
  @Transform(normalizarCorreo)
  @validator.IsEmail({}, { message: 'Email must be valid' })
  @validator.MaxLength(254)
  email: string;

  @Transform(recortar)
  @validator.IsString()
  @validator.MinLength(2)
  @validator.MaxLength(40)
  @validator.Matches(NOMBRE, { message: 'FirstName must contain only letters' })
  firstName: string;

  @Transform(recortar)
  @validator.IsString()
  @validator.MinLength(2)
  @validator.MaxLength(40)
  @validator.Matches(NOMBRE, { message: 'LastName must contain only letters' })
  lastName: string;

  @validator.IsString()
  @validator.MinLength(8)
  @validator.MaxLength(72)
  @validator.Matches(CLAVE_CON_LETRA_Y_NUMERO, {
    message: 'Password must include at least one letter and one number',
  })
  pass: string;

  @Transform(recortar)
  @IsBirthday()
  birthday: string;
}
