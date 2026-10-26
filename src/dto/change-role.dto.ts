import * as validator from 'class-validator';
import { Role } from 'src/enum/user-type.enum';

export class ChangeRoleDto {
  @validator.IsEnum(Role)
  role: Role;
}
