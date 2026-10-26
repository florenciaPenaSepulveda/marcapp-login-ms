import * as validator from 'class-validator';
import { CLAVE_CON_LETRA_Y_NUMERO } from './create-user.dto';

export class ChangePasswordDto {
  @validator.IsString()
  @validator.IsNotEmpty()
  @validator.MaxLength(72)
  currentPassword: string;

  @validator.IsString()
  @validator.MinLength(8)
  @validator.MaxLength(72)
  @validator.Matches(CLAVE_CON_LETRA_Y_NUMERO, {
    message: 'Password must include at least one letter and one number',
  })
  newPassword: string;
}
