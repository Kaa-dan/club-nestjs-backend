import { IsEnum, IsMongoId, IsString } from "class-validator"
import { Types } from "mongoose"

export class CreateDtoFaq {
    @IsString()
    question: string
    @IsMongoId()
    projectId: Types.ObjectId
}

export class AnswerFaqDto {
    @IsMongoId()
    project: Types.ObjectId

    @IsString()
    answer: string

    @IsEnum(['accepted', 'rejected'])
    status: "accepted" | "rejected"

    @IsMongoId()
    faq: Types.ObjectId
}