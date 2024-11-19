import {
  IsBoolean,
  IsDate,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Types } from 'mongoose';
import { IRelevantAndView } from 'src/shared/entities/issues.entity';
import { CreateIssuesDto } from './create-issue.dto';

export class UpdateIssuesDto extends CreateIssuesDto {
  @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  issueType: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  whereOrWho: string;

  @IsOptional()
  deadline: string;

  @IsOptional()
  @IsString()
  reasonOfDeadline: string;

  @IsOptional()
  @IsString()
  significance: string;

  @IsOptional()
  @IsMongoId()
  whoShouldAddress: Types.ObjectId[];

  @IsOptional()
  files: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  }[];

  @IsOptional()
  @IsBoolean()
  isPublic: boolean;

  @IsOptional()
  @IsBoolean()
  isAnonymous: boolean;

  @IsOptional()
  @IsMongoId()
  node?: Types.ObjectId;

  @IsOptional()
  @IsMongoId()
  club?: Types.ObjectId;
}
