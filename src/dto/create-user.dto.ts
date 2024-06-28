import * as validator from "class-validator";

export class CreateUserDto {
  @validator.IsEmail({}, {message: 'Email must be valid'})
  email: string;

  @validator.IsString()
  @validator.MinLength(2)
  @validator.MaxLength(20)
  @validator.Matches(/^[a-zA-Z]+(\s[a-zA-Z]+)?$/, {
    message: 'FirstName must be alphabetical',
  })
  firstName: string;

  @validator.IsString()
  @validator.MinLength(2)
  @validator.MaxLength(20)
  @validator.Matches(/^[a-zA-Z]+(\s[a-zA-Z]+)?$/, {
    message: 'LastName must be alphabetical',
  })
  lastName: string;

  @validator.IsString()
  @validator.MinLength(8)
  @validator.MaxLength(16)
  @validator.Matches(/^[a-zA-Z0-9]*$/, {
    message: 'Password must be alphanumeric',
  })
  pass: string;

  @validator.IsString()
  @validator.Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Birthday must be in the format YYYY-MM-DD',
  })
  birthday: string;
}
