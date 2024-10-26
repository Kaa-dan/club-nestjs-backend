import { IsString, IsOptional } from 'class-validator';

export class UpdateImageDto {
  @IsString()
  @IsOptional()
  profileImage?: string;

  @IsString()
  @IsOptional()
  coverImage?: string;
}
