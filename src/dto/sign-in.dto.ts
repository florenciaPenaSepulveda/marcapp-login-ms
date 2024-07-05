import * as validator from "class-validator";

export class SingInDto {
  @validator.IsEmail({}, {message: 'Email must be valid'})
  email: string;

  pass: string;
}
