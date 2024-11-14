import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Create a mapping for model references
const MODEL_REFS = {
  node: 'nodes',
  club: 'Club',
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
  clubOrNode: 'nodes' | 'Club';
  clubOrNodeId: Types.ObjectId;
}

@Schema({ collection: 'report_offences', timestamps: true })
export class ReportOffence extends Document implements IReportOffence {
  @Prop({ type: Types.ObjectId, ref: 'users', required: true })
  offender: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'users', required: true })
  reportedBy: Types.ObjectId;

  @Prop({ required: true, type: String })
  reason: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'RulesRegulations' })
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

  @Prop({ required: true, type: String, enum: ['nodes', 'Club'] })
  clubOrNode: 'nodes' | 'Club';

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
