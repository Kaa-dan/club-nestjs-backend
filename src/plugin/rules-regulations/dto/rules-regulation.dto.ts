import {
  IsString,
  IsArray,
  IsBoolean,
  IsOptional,
  IsMongoId,
  IsNumber,
  IsDate,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';

export class CreateRulesRegulationsDto {
  @IsOptional()
  @IsArray()
  olderVersions?: Record<string, any>[];

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

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  file: string[];

  @IsOptional()
  @IsArray()
  views?: {
    user: Types.ObjectId;
    date: Date;
  }[];

  @IsOptional()
  @IsMongoId()
  club?: Types.ObjectId;

  @IsOptional()
  @IsMongoId()
  node?: Types.ObjectId;

  @IsMongoId()
  createdBy: Types.ObjectId;

  @IsArray()
  @IsMongoId({ each: true })
  adoptedClubs: Types.ObjectId[];

  @IsArray()
  @IsMongoId({ each: true })
  adoptedNodes: Types.ObjectId[];

  @IsNumber()
  version: number;

  @IsString()
  publishedStatus: string;

  @IsDate()
  @Type(() => Date)
  publishedDate: Date;

  @IsMongoId()
  publishedBy: Types.ObjectId;

  @IsBoolean()
  isActive: boolean;
}
