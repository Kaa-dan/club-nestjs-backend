import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  collection: 'nodes',
})
export class Group extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  profilePic?: string;

  @Prop({ required: true })
  about: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  coverPic?: string;

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User', required: true },
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
    userId: Types.ObjectId;
    role: 'admin' | 'moderator' | 'member';
    designation: string;
  }[];

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User', required: true },
        date: { type: Date, required: true },
      },
    ],
    default: [],
  })
  blockedUsers: {
    userId: Types.ObjectId;
    date: Date;
  }[];

  @Prop({ default: false })
  isVerified?: boolean;

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

export const GroupSchema = SchemaFactory.createForClass(Group);
