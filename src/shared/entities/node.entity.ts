import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  collection: 'nodes',
  timestamps: true,
})
export class Node_ extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  profileImage?: string;

  @Prop()
  coverImage?: string;

  @Prop({ required: true })
  about: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  coverPic?: string;

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'users', required: true },
        role: {
          type: String,
          enum: ['admin', 'moderator', 'member'],
          required: true,
        },
        designation: { type: String, required: true },
      },
    ],
    default: [],
  })
  members: {
    user: Types.ObjectId | string;
    role: 'admin' | 'moderator' | 'member';
    designation: string;
  }[];

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'users', required: true },
        date: { type: Date, required: true },
      },
    ],
    default: [],
  })
  blockedUsers: {
    userId: Types.ObjectId;
    date: Date;
  }[];

  @Prop({ type: Types.ObjectId, ref: 'users', required: true })
  creator: Types.ObjectId;

  @Prop({ default: false })
  isVerified?: boolean;

  @Prop({ required: false })
  location: string;

  @Prop({
    type: [
      {
        oid: { type: Types.ObjectId, ref: 'Module', required: true },
        config: { type: Object, required: true },
      },
    ],
    validate: {
      validator: (modules) => modules.length > 0,
      message: 'There must be at least one module',
    },
  })
  modules: {
    oid: Types.ObjectId;
    config: Record<string, unknown>;
  }[];
}

export const NodeSchema = SchemaFactory.createForClass(Node_);
