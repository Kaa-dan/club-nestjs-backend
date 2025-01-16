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
  @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  significance: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  tags: string[];

  @IsOptional()
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

  @IsOptional()
  @IsMongoId()
  createdBy: Types.ObjectId;

  @IsNumber()
  version: number;

  @IsString()
  publishedStatus: 'draft' | 'published' | 'proposed';

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  publishedDate: Date;

  @IsMongoId()
  publishedBy: Types.ObjectId;

  @IsBoolean()
  isActive: boolean;

  @IsString()
  domain: string;
}
