import {
  IsMongoId,
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';
import { Types } from 'mongoose';

export class CreateAdoptContributionDto {
  @IsNotEmpty()
  @IsMongoId()
  rootProject: Types.ObjectId;

  @IsNotEmpty()
  @IsMongoId()
  project: Types.ObjectId;

  @IsNotEmpty()
  @IsMongoId()
  parameter: Types.ObjectId;

  @IsNotEmpty()
  @IsMongoId()
  club?: Types.ObjectId;

  @IsNotEmpty()
  @IsMongoId()
  node?: Types.ObjectId;

  @IsNotEmpty()
  @IsOptional()
  @IsNumber()
  value: number;

  @IsOptional()
  @IsArray()
  files?: any[];

  @IsOptional()
  @IsString()
  @IsEnum(['accepted', 'pending', 'rejected'])
  status?: 'accepted' | 'pending' | 'rejected';
}
