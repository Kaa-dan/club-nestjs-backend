import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Interface for the views array objects
interface View {
  user: Types.ObjectId;
  date: Date;
}

@Schema({ collection: 'rulesandregulations', timestamps: true })
export class RulesRegulations extends Document {
  //older version of rules and regulation :copy of the schema
  olderVersions: [{}];

  @Prop({})
  title: string;

  @Prop({})
  description: string;

  @Prop({})
  category: string;

  @Prop({})
  significance: string;

  @Prop({ type: [String] })
  tags: string[];

  @Prop({ default: false })
  isPublic: boolean;

  @Prop({
    type: [
      {
        url: String,
        originalname: String,
        mimetype: String,
        size: Number,
      },
    ],
  })
  files: { url: string; originalname: string; size: number }[];

  @Prop([
    {
      user: { type: Types.ObjectId, ref: 'users' },
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
    type: Types.ObjectId,
    ref: 'users',
  })
  createdBy: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Clubs',
  })
  adoptedClubs: [];

  @Prop({
    type: Types.ObjectId,
    ref: 'Nodes',
  })
  adoptedNodes: [];
  @Prop({ default: 1 })
  version: number;

  @Prop({ default: true })
  publishedStatus: 'draft' | 'published' | 'olderversion';

  @Prop({})
  publishedDate: Date;

  @Prop({ ref: 'User' })
  publishedBy: Types.ObjectId;

  @Prop()
  isActive: boolean;

  updatedDate: Date;

  adoptedDate: Date;

  adoptedParent: null | Types.ObjectId;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'users' }],
    default: [],
  })
  relevant: Types.ObjectId[];

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'users' }],
    default: [],
  })
  irrelevant: Types.ObjectId[];
  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: String })
  domain: string;
}

export const RulesRegulationsSchema =
  SchemaFactory.createForClass(RulesRegulations);
