import { Transform } from 'class-transformer';
import * as validator from 'class-validator';
import { normalizarCorreo } from 'src/common/transformers';

export class SingInDto {
  @Transform(normalizarCorreo)
  @validator.IsEmail({}, { message: 'Email must be valid' })
  @validator.MaxLength(254)
  email: string;

  @validator.IsString()
  @validator.IsNotEmpty()
  @validator.MaxLength(72)
  pass: string;
}
