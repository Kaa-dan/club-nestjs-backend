import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsDate,
  IsArray,
  ValidateNested,
  IsEnum,
  IsMongoId,
} from 'class-validator';
import { Types } from 'mongoose';

class TeamMemberDto {
  @IsString()
  name: string;

  @IsString()
  designation: string;
}

class BudgetDto {
  @IsNumber()
  from: number;

  @IsNumber()
  to: number;

  @IsString()
  currency: string;
}

// Parameter DTO
class ParameterDto {
  @IsString()
  title: string;

  @IsNumber()
  value: number;

  @IsString()
  unit: string;
}

// FAQ DTO
class FaqDto {
  @IsMongoId()
  @IsOptional()
  project?: Types.ObjectId;

  @IsEnum(['proposed', 'approved', 'rejected'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  answer: string;

  @IsString()
  question: string;

  @IsMongoId()
  @IsOptional()
  askedBy?: Types.ObjectId;

  @IsMongoId()
  @IsOptional()
  answeredBy?: Types.ObjectId;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  Date?: Date;
}

// Combined Project Creation DTO
export class CreateProjectDto {
  // Project Details
  @IsString()
  title: string;

  @IsString()
  region: string;

  @ValidateNested()
  budget: any;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  deadline?: Date;

  @IsString()
  @IsOptional()
  significance?: string;

  @IsString()
  @IsOptional()
  solution?: string;

  @IsOptional()
  bannerImage?: Express.Multer.File;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  @IsOptional()
  committees?: TeamMemberDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  @IsOptional()
  champions?: TeamMemberDto[];

  @IsString()
  @IsOptional()
  aboutPromoters?: string;

  @IsString()
  @IsOptional()
  fundingDetails?: string;

  @IsString()
  @IsOptional()
  keyTakeaways?: string;

  @IsString()
  @IsOptional()
  risksAndChallenges?: string;

  @IsEnum(['draft', 'published', 'proposed', 'rejected'])
  @IsOptional()
  status?: string;

  @IsArray()
  @IsOptional()
  files?: Express.Multer.File[];

  // Optional Parameters Array
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParameterDto)
  @IsOptional()
  parameters?: ParameterDto[];

  // Optional FAQs Array
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaqDto)
  @IsOptional()
  faqs?: FaqDto[];
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
