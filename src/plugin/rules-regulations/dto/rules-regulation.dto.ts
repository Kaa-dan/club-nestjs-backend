import {
  IsString,
  IsArray,
  IsBoolean,
  IsOptional,
  IsMongoId,
  IsNumber,
  IsDate,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';

export class CreateRulesRegulationsDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  category: string;

  @IsString()
  significance: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  tags: string[];

  @IsBoolean()
  isPublic: boolean;

  @IsOptional()
  @IsMongoId()
  club?: Types.ObjectId;

  @IsOptional()
  files: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  }[];

  @IsOptional()
  @IsMongoId()
  node?: Types.ObjectId;

  @IsMongoId()
  createdBy: Types.ObjectId;

  @IsOptional()
  @IsNumber()
  version: number;

  @IsString()
  publishedStatus: 'draft' | 'published';

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  publishedDate: Date;

  @IsMongoId()
  publishedBy: Types.ObjectId;

  @IsBoolean()
  isActive: boolean;
}
