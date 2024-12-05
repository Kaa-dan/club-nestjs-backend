import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.entity';
import { Club } from './club.entity';
import { Node_ } from './node.entity';

export interface IRelevantAndView {
  user: Types.ObjectId;
  date: Date;
}
[];

@Schema({ timestamps: true })
export class Issues extends Document {
  @Prop({ trim: true, required: true })
  title: string;

  @Prop({ trim: true, required: true })
  issueType: string;

  @Prop({ trim: true, required: false })
  whereOrWho: string;

  @Prop({ required: false })
  deadline: Date;

  @Prop({ required: false })
  reasonOfDeadline: string;

  @Prop({ required: false })
  significance: string;

  @Prop({
    type: [Types.ObjectId],
    ref: User.name,
    required: false,
  })
  whoShouldAddress: Types.ObjectId[];

  @Prop({})
  description: string;

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
  files: { url: string; originalname: string; mimetype: string; size: number };

  @Prop({ default: false })
  isPublic: boolean;

  @Prop({ default: false })
  isAnonymous: boolean;

  @Prop([
    {
      user: { type: Types.ObjectId, ref: User.name },
      date: { type: Date, default: Date.now },
    },
  ])
  views: IRelevantAndView[];

  @Prop([
    {
      user: { type: Types.ObjectId, ref: User.name },
      date: { type: Date, default: Date.now },
    },
  ])
  relevant: IRelevantAndView[];

  @Prop([
    {
      user: { type: Types.ObjectId, ref: User.name },
      date: { type: Date, default: Date.now },
    },
  ])
  irrelevant: IRelevantAndView[];

  @Prop({
    type: Types.ObjectId,
    ref: Club.name,
  })
  club: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: Node_.name,
  })
  node: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: User.name,
  })
  createdBy: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: User.name,
  })
  publishedBy: Types.ObjectId;
  publishedDate: Date;
  updatedDate: Date;
  adoptedDate: Date;
  @Prop({
    type: Types.ObjectId,
    ref: Issues.name,
    default: null,
    required: false,
  })
  adoptedFrom: null | Types.ObjectId;

  @Prop([
    {
      club: { type: Types.ObjectId, ref: Club.name },
      date: { type: Date, default: Date.now },
    },
  ])
  adoptedClubs: {
    club: Types.ObjectId;
    date: Date;
  }[];

  @Prop([
    {
      node: { type: Types.ObjectId, ref: Node_.name },
      date: { type: Date, default: Date.now },
    },
  ])
  adoptedNodes: {
    node: Types.ObjectId;
    date: Date;
  }[];
  @Prop({ default: 'draft' })
  publishedStatus:
    | 'draft'
    | 'published'
    | 'olderversion'
    | 'proposed'
    | 'archived';

  @Prop()
  isActive: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: 1 })
  version: number;

  @Prop()
  olderVersions: [{}];

  rootParent: null | Types.ObjectId;
}

export const IssuesSchema = SchemaFactory.createForClass(Issues);
