import { IsEnum, IsMongoId, IsNotEmpty, IsString, ValidateIf } from "class-validator";
import { Types } from "mongoose";

export class CreateChapterDto {

    @IsMongoId()
    @IsNotEmpty()
    club: Types.ObjectId;

    @IsMongoId()
    @IsNotEmpty()
    node: Types.ObjectId;
}


export type ChapterStatus = 'publish' | 'reject';

export class UpdateChapterStatusDto {
    @IsMongoId()
    @IsNotEmpty()
    chapterId: Types.ObjectId;

    @IsEnum(['publish', 'reject'], {
        message: 'Status must be either "publish" or "reject"'
    })
    @IsNotEmpty()
    status: ChapterStatus;

    @ValidateIf((o) => o.status === 'reject', {
        message: 'Reason is required when status is "reject"',
    })
    @IsString()
    @IsNotEmpty()
    rejectedReason: string;

    @IsMongoId()
    @IsNotEmpty()
    node: Types.ObjectId;
}

export class JoinUserChapterDto {
    @IsMongoId()
    @IsNotEmpty()
    chapter: Types.ObjectId;

    @IsMongoId()
    @IsNotEmpty()
    node: Types.ObjectId;
}

export class RemoveUserChapterDto {
    @IsMongoId()
    @IsNotEmpty()
    chapter: Types.ObjectId;

    @IsMongoId()
    @IsNotEmpty()
    userToRemove: Types.ObjectId;

    @IsMongoId()
    @IsNotEmpty()
    node: Types.ObjectId;
}

export class DeleteChapterDto {
    @IsMongoId()
    @IsNotEmpty()
    chapter: Types.ObjectId;

    @IsMongoId()
    @IsNotEmpty()
    node: Types.ObjectId;
}

export class LeaveUserChapterDto {
    @IsMongoId()
    @IsNotEmpty()
    chapter: Types.ObjectId;
}