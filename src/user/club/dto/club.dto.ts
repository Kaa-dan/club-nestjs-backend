import { IsString, IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClubDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly about: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly description: string;

  @ApiProperty()
  @IsBoolean()
  readonly isPublic: boolean;

  profileImage: Express.Multer.File;
  coverImage: Express.Multer.File;
}

export class UpdateClubDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  about?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  profileImage?: Express.Multer.File;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  coverImage?: Express.Multer.File;
}
