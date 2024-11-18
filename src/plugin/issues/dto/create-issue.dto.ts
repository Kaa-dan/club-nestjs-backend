import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Types } from 'mongoose';

export class FileDto {
  @IsNotEmpty()
  buffer: Buffer;

  @IsString()
  @IsNotEmpty()
  originalname: string;

  @IsString()
  @IsNotEmpty()
  mimetype: string;

  @IsNumber()
  @Min(0)
  size: number;
}
export class CreateIssuesDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  issueType: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  whereOrWho: string;

  @IsOptional()
  @IsDate()
  deadline: Date;

  @IsOptional()
  @IsString()
  reasonOfDeadline: string;

  @IsNotEmpty()
  @IsString()
  significance: string;

  @IsOptional()
  @IsMongoId({ each: true })
  whoShouldAddress: Types.ObjectId[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FileDto)
  files: FileDto[];

  @IsBoolean()
  isPublic: boolean;

  @IsBoolean()
  isAnonymous: boolean;

  @IsOptional()
  @IsMongoId()
  node?: Types.ObjectId;

  @IsOptional()
  @IsMongoId()
  club?: Types.ObjectId;
}
