import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";
import { Types } from "mongoose";
import { Club } from "src/shared/entities/club.entity";
import { Node_ } from "src/shared/entities/node.entity";
import { RulesRegulations } from "src/shared/entities/rules-requlations.entity";

class EntityDto {
    @IsNotEmpty()
    entityId: Types.ObjectId;

    @IsEnum([Node_.name, Club.name, RulesRegulations.name])
    @IsNotEmpty()
    entityType: typeof Node_.name | typeof Club.name | typeof RulesRegulations.name
}

// export const entities = ['post', 'debate', 'nodes', 'Club', 'RulesRegulations'];
export const entities = [Node_.name, Club.name, RulesRegulations.name];

export class CreateCommentDto {
    @IsString()
    @IsNotEmpty()
    content: string;

    @IsNotEmpty()
    entityId: Types.ObjectId;

    @IsEnum([Node_.name, Club.name, RulesRegulations.name])
    @IsNotEmpty()
    entityType: typeof Node_.name | typeof Club.name | typeof RulesRegulations.name;

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