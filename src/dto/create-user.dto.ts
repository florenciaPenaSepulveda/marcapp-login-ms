import { IsEmail, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class CreateUserDto {
  @IsEmail({})
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(20)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(20)
  lastName: string;

  @IsString()
  @MinLength(8)
  @MaxLength(16)
  @Matches(/^[a-zA-Z0-9]*$/, {
    message: 'Password must be alphanumeric',
  })
  pass: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Birthday must be in the format YYYY-MM-DD',
  })
  birthday: string;
}
