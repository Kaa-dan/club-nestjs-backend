import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Types } from 'mongoose';
import { Club } from 'src/shared/entities/club.entity';
import { Issues } from 'src/shared/entities/issues/issues.entity';
import { Node_ } from 'src/shared/entities/node.entity';
import { Project } from 'src/shared/entities/projects/project.entity';
import { RulesRegulations } from 'src/shared/entities/rules-regulations.entity';

class EntityDto {
  @IsNotEmpty()
  entityId: Types.ObjectId;

  @IsEnum([Node_.name, Club.name, RulesRegulations.name])
  @IsNotEmpty()
  entityType:
    | typeof Node_.name
    | typeof Club.name
    | typeof RulesRegulations.name
    | typeof Issues.name
    | typeof Project.name;
}

// export const entities = ['post', 'debate', 'nodes', 'Club', 'RulesRegulations'];
export const entities = [
  Node_.name,
  Club.name,
  RulesRegulations.name,
  Issues.name,
  Project.name,
];

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsNotEmpty()
  entityId: Types.ObjectId;

  @IsEnum([
    Node_.name,
    Club.name,
    RulesRegulations.name,
    Issues.name,
    Project.name,
  ])
  @IsNotEmpty()
  entityType:
    | typeof Node_.name
    | typeof Club.name
    | typeof RulesRegulations.name
    | typeof Issues.name
    | typeof Project.name;

  @IsOptional()
  parent?: Types.ObjectId;

  @IsOptional()
  attachment?: {
    url: string;
    filename: string;
    mimetype: string;
  };
}

export class UpdateCommentDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsOptional()
  attachment?: {
    url: string;
    filename: string;
    mimetype: string;
  };
}
