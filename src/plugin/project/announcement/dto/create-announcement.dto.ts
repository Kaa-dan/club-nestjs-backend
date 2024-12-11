import { IsMongoId, IsOptional, IsString } from "class-validator";
import { Types } from "mongoose";

export class CreateAnnouncementDto {

    @IsMongoId()
    projectId: Types.ObjectId

    @IsString()
    announcement: string

    @IsOptional()
    file?: { buffer: Buffer; originalname: string, mimetype: string, size: number }[]

}
