import {
  IsString,
  IsOptional,
  IsDate,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';

export class FileDto {
  @IsString()
  url: string;

  @IsString()
  originalName: string;

  @IsString()
  mimetype: string;

  @IsOptional()
  size: number;
}

export class CreateDebateDto {
  @IsString()
  topic: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  closingDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  openingDate?: Date;

  @IsString()
  significance: string;

  @IsString()
  targetAudience: string;

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileDto)
  files?: FileDto[];

  @IsString()
  openingCommentsFor: string;

  @IsString()
  openingCommentsAgainst: string;

  @IsBoolean()
  isPublic: boolean;

  @IsOptional()
  @IsMongoId()
  createdBy?: Types.ObjectId;
  @IsOptional()
  @IsMongoId()
  club?: Types.ObjectId;
  @IsOptional()
  @IsMongoId()
  node?: Types.ObjectId;
  @IsOptional()
  @IsString()
  publishedStatus?: TPublishedStatus;
}
