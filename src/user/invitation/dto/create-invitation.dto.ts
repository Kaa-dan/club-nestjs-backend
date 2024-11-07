import { IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class CreateInvitationDto {
  @IsMongoId()
  clubId: Types.ObjectId;

  @IsMongoId()
  userId: Types.ObjectId;
}
