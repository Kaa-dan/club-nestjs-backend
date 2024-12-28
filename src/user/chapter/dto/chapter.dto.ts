import { IsEnum, IsMongoId, IsNotEmpty, IsString } from "class-validator";
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
}