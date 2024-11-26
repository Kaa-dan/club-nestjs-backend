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

  @Prop({ type: String, required: false }) // Add this for optional image URL
  imageUrl?: string; // Use `?` to indicate that this property is optional

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

  @Prop({ type: String, ref: DebateArgument.name })
  rootParent?: string; // This can be used for replies

  @Prop({ type: Types.ObjectId, ref: DebateArgument.name, default: null })
  parentId?: Types.ObjectId;
}

export const DebateArgumentSchema =
  SchemaFactory.createForClass(DebateArgument);
