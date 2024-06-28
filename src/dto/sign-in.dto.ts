import * as validator from "class-validator";

export class SingInDto {
  @validator.IsEmail({}, {message: 'Email must be valid'})
  email: string;

  @validator.MinLength(8)
  @validator.MaxLength(16)
  @validator.Matches(/^[a-zA-Z0-9]*$/, {
    message: 'Password must be alphanumeric',
  })
  pass: string;
}
