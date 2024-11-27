import { IsString, IsOptional, IsMongoId } from 'class-validator';

export class CreateCommentDto {
  @IsMongoId() // Validate that the debateId is a valid MongoDB ObjectId
  debateId: string;

  @IsMongoId() // Validate that the userId is a valid MongoDB ObjectId
  userId: string;

  @IsString() // Ensure content is a string
  content: string;

  @IsOptional() // parentId is optional, used for replies
  @IsMongoId()
  parentId?: string;
}
