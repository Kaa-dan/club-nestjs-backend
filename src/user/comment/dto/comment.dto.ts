import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";
import { Types } from "mongoose";

class EntityDto {
    @IsNotEmpty()
    entityId: Types.ObjectId;

    @IsEnum(['post', 'debate', 'nodes', 'Club'])
    @IsNotEmpty()
    entityType: 'post' | 'debate' | 'nodes' | 'Club';
}

export const entities = ['post', 'debate', 'nodes', 'Club'];

export class CreateCommentDto {
    @IsString()
    @IsNotEmpty()
    content: string;

    @IsNotEmpty()
    entityId: Types.ObjectId;

    @IsEnum(['post', 'debate', 'nodes', 'Club'])
    @IsNotEmpty()
    entityType: 'post' | 'debate' | 'nodes' | 'Club';

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