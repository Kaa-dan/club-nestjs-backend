import { IsMongoId, IsNotEmpty, IsString } from "class-validator";
import { Types } from "mongoose";

export class CreateChapterDto {

    @IsMongoId()
    @IsNotEmpty()
    club: Types.ObjectId;

    @IsMongoId()
    @IsNotEmpty()
    node: Types.ObjectId;
}