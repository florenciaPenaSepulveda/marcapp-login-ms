import * as validator from "class-validator";

export class UpdateUserDto {
  @validator.IsString()
  @validator.MinLength(2)
  @validator.MaxLength(20)
  @validator.Matches(/^[a-zA-Z]*$/, {
    message: 'FirstName must be alphabetical',
  })
  firstName: string;

  @validator.IsString()
  @validator.MinLength(2)
  @validator.MaxLength(20)
  @validator.Matches(/^[a-zA-Z]*$/, {
    message: 'LastName must be alphabetical',
  })
  lastName: string;

  @validator.IsEmail()
  email: string;
}
  