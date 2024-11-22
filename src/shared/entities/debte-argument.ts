import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Debate } from './debate.entity';
import { User } from './user.entity';
@Schema({ timestamps: true })
export class DebateArgument extends Document {
  @Prop({ type: Types.ObjectId, ref: Debate.name, required: true })
  debate: Types.ObjectId; // Reference to the Debate document

  @Prop({
    type: {
      user: { type: Types.ObjectId, ref: User.name, required: true },
      side: { type: String, enum: ['support', 'against'], required: true },
    },
    required: true,
  })
  participant: {
    user: Types.ObjectId; // Reference to the User document
    side: 'support' | 'against'; // Side chosen by the participant
  };

  @Prop({ type: String, required: true })
  content: string; // The argument content

  @Prop({ type: Date, default: Date.now })
  timestamp: Date; // Timestamp of when the argument was created
}

export const DebateArgumentSchema =
  SchemaFactory.createForClass(DebateArgument);
