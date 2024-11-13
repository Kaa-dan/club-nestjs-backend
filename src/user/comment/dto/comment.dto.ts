import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";
import { Types } from "mongoose";

class EntityDto {
    @IsNotEmpty()
    entityId: Types.ObjectId;

    @IsEnum(['post', 'debate', 'nodes', 'Club', 'RulesRegulations'])
    @IsNotEmpty()
    entityType: 'post' | 'debate' | 'nodes' | 'Club' | 'RulesRegulations';
}

export const entities = ['post', 'debate', 'nodes', 'Club', 'RulesRegulations'];

export class CreateCommentDto {
    @IsString()
    @IsNotEmpty()
    content: string;

    @IsNotEmpty()
    entityId: Types.ObjectId;

    @IsEnum(['post', 'debate', 'nodes', 'Club', 'RulesRegulations'])
    @IsNotEmpty()
    entityType: 'post' | 'debate' | 'nodes' | 'Club' | 'RulesRegulations';

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