import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Interface for the views array objects
interface View {
  user: Types.ObjectId;
  date: Date;
}
//copy of this will get pushed and this will be udated

@Schema({ collection: 'rulesandregulations', timestamps: true })
export class RulesRegulations extends Document {
  //this will have all the older versions of this schema it means copy of the schema
  olderVersions: [{}];

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  significance: string;

  @Prop({ required: true, type: [String] })
  tags: string[];

  @Prop({ required: true, default: false })
  isPublic: boolean;

  @Prop({ required: true })
  file: string[];

  @Prop([
    {
      user: { type: Types.ObjectId, ref: 'User', required: true },
      date: { type: Date, default: Date.now },
    },
  ])
  views: View[];

  @Prop({
    type: Types.ObjectId,
    ref: 'Clubs',
  })
  club: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Nodes',
  })
  node: Types.ObjectId;
  //created
  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: 'User',
  })
  createdBy: Types.ObjectId;

  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: 'Clubs',
  })
  adoptedClubs: [];

  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: 'Nodes',
  })
  adoptedNodes: [];

  @Prop({ required: true })
  version: number;

  @Prop({ required: true })
  publishedStatus: string;

  @Prop({ required: true })
  publishedDate: Date;

  @Prop({ required: true, ref: 'User' })
  publishedBy: Types.ObjectId;

  @Prop({ required: true })
  isActive: boolean;
}

export const RulesRegulationsSchema =
  SchemaFactory.createForClass(RulesRegulations);
