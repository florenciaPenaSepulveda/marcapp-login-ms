import { Transform } from 'class-transformer';
import * as validator from 'class-validator';
import { normalizarCorreo, recortar } from 'src/common/transformers';
import { IsBirthday } from './birthday.validator';
import { NOMBRE } from './create-user.dto';

export class UpdateUserDto {
  @validator.IsOptional()
  @Transform(recortar)
  @validator.IsString()
  @validator.MinLength(2)
  @validator.MaxLength(40)
  @validator.Matches(NOMBRE, { message: 'FirstName must contain only letters' })
  firstName?: string;

  @validator.IsOptional()
  @Transform(recortar)
  @validator.IsString()
  @validator.MinLength(2)
  @validator.MaxLength(40)
  @validator.Matches(NOMBRE, { message: 'LastName must contain only letters' })
  lastName?: string;

  @validator.IsOptional()
  @Transform(normalizarCorreo)
  @validator.IsEmail({}, { message: 'Email must be valid' })
  @validator.MaxLength(254)
  email?: string;

  @validator.IsOptional()
  @Transform(recortar)
  @IsBirthday()
  birthday?: string;
}
