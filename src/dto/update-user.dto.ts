import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class UpdateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @Matches(/^[a-zA-Z]*$/, {
    message: 'FirstName must be alphabetical',
  })
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @Matches(/^[a-zA-Z]*$/, {
    message: 'LastName must be alphabetical',
  })
  lastName: string;
}
  