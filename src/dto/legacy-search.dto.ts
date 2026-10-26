import { Transform } from 'class-transformer';
import * as validator from 'class-validator';
import { recortar } from 'src/common/transformers';

export class LegacySearchDto {
  @validator.IsOptional()
  @Transform(recortar)
  @validator.IsString()
  @validator.MaxLength(60)
  searchTerm?: string;
}
