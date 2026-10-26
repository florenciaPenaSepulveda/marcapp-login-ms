import { Transform, Type } from 'class-transformer';
import * as validator from 'class-validator';
import { recortar } from 'src/common/transformers';
import { Role } from 'src/enum/user-type.enum';

export class ListUsersQueryDto {
  @validator.IsOptional()
  @Transform(recortar)
  @validator.IsString()
  @validator.MaxLength(60)
  search?: string;

  @validator.IsOptional()
  @validator.IsEnum(Role)
  role?: Role;

  @validator.IsOptional()
  @Type(() => Number)
  @validator.IsInt()
  @validator.Min(1)
  @validator.Max(100)
  limit?: number;

  @validator.IsOptional()
  @Type(() => Number)
  @validator.IsInt()
  @validator.Min(0)
  offset?: number;
}
