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

class AttachmentDto {
    @IsString()
    @IsNotEmpty()
    url: string;

    @IsEnum(['image', 'file'])
    @IsNotEmpty()
    type: 'image' | 'file';

    @IsString()
    @IsNotEmpty()
    filename: string;
}

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
    attachment?: AttachmentDto;
}

class UpdateAttachmentDto {
    @IsString()
    url: string;

    @IsEnum(['image', 'file'])
    type: 'image' | 'file';

    @IsString()
    filename: string;
}

export class UpdateCommentDto {
    @IsString()
    @IsOptional()
    content?: string;

    @IsOptional()
    attachment?: UpdateAttachmentDto;
}