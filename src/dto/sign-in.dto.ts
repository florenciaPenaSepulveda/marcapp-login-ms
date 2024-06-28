import { IsEmail, Matches, MaxLength, MinLength } from "class-validator";

export class SingInDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  @MaxLength(16)
  @Matches(/^[a-zA-Z0-9]*$/, {
    message: 'Password must be alphanumeric',
  })
  pass: string;
}
