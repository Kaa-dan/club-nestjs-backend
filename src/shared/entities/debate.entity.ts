import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Schema } from '@nestjs/mongoose';
import { Club } from './club.entity';
import { Node_ } from './node.entity';
import { User } from './user.entity';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Debate extends Document {
  @Prop({ trim: true, required: true })
  topic: string;

  @Prop({ required: true })
  closingDate: Date;

  @Prop({ required: true })
  openingDate: Date;

  @Prop({ required: true })
  significance: string;

  @Prop({ required: true })
  targetAudience: string;

  @Prop([String])
  tags: string[];

  @Prop([
    {
      url: String,
      originalName: String,
      mimetype: String,
      size: Number,
    },
  ])
  files: {
    url: string;
    originalName: string;
    mimetype: string;
    size: number;
  }[];

  @Prop({ required: true })
  openingCommentsFor: string;

  @Prop({ required: true })
  openingCommentsAgainst: string;

  @Prop({ default: false })
  isPublic: boolean;

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
    type: [
      {
        club: { type: Types.ObjectId, ref: Club.name },
        date: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  adoptedClubs: {
    club: Types.ObjectId;
    date: Date;
  }[];

  @Prop({
    type: [
      {
        node: { type: Types.ObjectId, ref: Node_.name },
        date: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  adoptedNodes: {
    node: Types.ObjectId;
    date: Date;
  }[];

  @Prop({ type: Types.ObjectId, ref: User.name })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name })
  publishedBy: Types.ObjectId;

  @Prop({ default: 'proposed' })
  publishedStatus: TPublishedStatus;
}

export const DebateSchema = SchemaFactory.createForClass(Debate);
