import { IsMongoId, IsNotEmpty } from "class-validator";

export class CreateSolutionDto {
    @IsNotEmpty()
    @IsMongoId()
    forum: string;

    @IsMongoId()
    @IsNotEmpty()
    forumId: string;

    @IsMongoId()
    @IsNotEmpty()
    commentId: string;

    @IsMongoId()
    @IsNotEmpty()
    postId: string;
}