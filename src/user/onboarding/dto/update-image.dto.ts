// update-image.dto.ts
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateImageDto {
  @ApiProperty({ type: 'string', format: 'binary', required: false })
  @IsOptional()
  profileImage?: Express.Multer.File;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  @IsOptional()
  coverImage?: Express.Multer.File;
}
