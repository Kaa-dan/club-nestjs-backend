import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Debate } from './debate.entity';
import { User } from './user.entity';

@Schema({ timestamps: true })
export class DebateArgument extends Document {
  @Prop({ type: Types.ObjectId, ref: Debate.name, required: true })
  debate: Types.ObjectId;

  @Prop({
    type: {
      user: { type: Types.ObjectId, ref: User.name, required: true },
      side: { type: String, enum: ['support', 'against'] },
    },
    required: true,
  })
  participant: {
    user: Types.ObjectId;
    side: 'support' | 'against';
  };

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;

  @Prop([
    {
      url: String,
      originalName: String,
      mimetype: String,
      size: Number,
    },
  ])
  image: {
    url: string;
    originalName: string;
    mimetype: string;
    size: number;
  };

  @Prop({
    type: [{ type: Types.ObjectId, ref: User.name }],
    default: [],
  })
  relevant: Types.ObjectId[];

  @Prop({
    type: [{ type: Types.ObjectId, ref: User.name }],
    default: [],
  })
  irrelevant: Types.ObjectId[];

  // New fields for pinning functionality
  @Prop({ type: Boolean, default: false })
  isPinned: boolean;

  @Prop({ type: Date, default: null })
  pinnedAt: Date;

  @Prop({ type: Types.ObjectId })
  parentId: Types.ObjectId;

  @Prop({ default: false, type: Boolean })
  startingPoint: boolean;
}

export const DebateArgumentSchema =
  SchemaFactory.createForClass(DebateArgument);
