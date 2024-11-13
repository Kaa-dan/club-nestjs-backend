import { IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class CreateReportDto {
  type: 'rules' | 'comment' | 'debate';

  @IsMongoId()
  typeId: Types.ObjectId;
}
