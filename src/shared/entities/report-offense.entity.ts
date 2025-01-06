import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.entity';
import { RulesRegulations } from './rules-regulations.entity';
import { Node_ } from './node.entity';
import { Club } from './club.entity';

// Create a mapping for model references
const MODEL_REFS = {
  [Node_.name]: Node_.name,
  [Club.name]: Club.name,
} as const;

export interface IReportOffence {
  offender: Types.ObjectId;
  reportedBy: Types.ObjectId;
  reason: string;
  rulesId: Types.ObjectId;
  proof: {
    url: string;
    filename: string;
  };
  clubOrNode: typeof Node_.name | typeof Club.name;
  clubOrNodeId: Types.ObjectId;
}

@Schema({ timestamps: true })
export class ReportOffence extends Document implements IReportOffence {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  offender: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  reportedBy: Types.ObjectId;

  @Prop({ required: true, type: String })
  reason: string;

  @Prop({ required: true, type: Types.ObjectId, ref: RulesRegulations.name })
  rulesId: Types.ObjectId;

  @Prop({
    required: true, type: {
      url: String,
      filename: String
    }
  })
  proof: {
    url: string;
    filename: string;
  };

  @Prop({ required: true, type: String, enum: [Node_.name, Club.name] })
  clubOrNode: typeof Node_.name | typeof Club.name;

  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: function (this: ReportOffence) {
      return MODEL_REFS[this.clubOrNode];
    },
  })
  clubOrNodeId: Types.ObjectId;
}

export const ReportOffenceSchema = SchemaFactory.createForClass(ReportOffence);

export type ReportOffenceDocument = ReportOffence & Document;

//WANT TO CHECK THIS AM NOT SURE ABOUT THIS
ReportOffenceSchema.virtual('modelReference').get(function () {
  return MODEL_REFS[this.clubOrNode];
});
