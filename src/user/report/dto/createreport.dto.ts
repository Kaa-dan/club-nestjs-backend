import { IsMongoId } from 'class-validator';
import { Types } from 'mongoose';
import { RulesRegulations } from 'src/shared/entities/rules-requlations.entity';

export class CreateReportDto {
  type: typeof RulesRegulations.name | typeof Comment.name;

  @IsMongoId()
  typeId: Types.ObjectId;
}
