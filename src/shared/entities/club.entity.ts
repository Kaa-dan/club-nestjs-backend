import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum MemberRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member',
}

// type for members
export interface IMember {
  userId: Types.ObjectId;
  role: MemberRole;
  designation: string;
  date: Date;
}

// type for blocked members
export interface IBlockedUser {
  userId: Types.ObjectId;
  date: Date;
}

@Schema({
  collection: 'clubs',
  timestamps: true,
})
export class Club extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  about: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  profileImage: string;

  @Prop({ required: true })
  coverImage: string;

  @Prop({ required: true, default: false })
  isPublic: boolean;

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User', required: true },
        role: {
          type: String,
          enum: Object.values(MemberRole),
          required: true,
        },
        designation: { type: String, required: true },
        date: { type: Date, default: Date.now, required: true },
      },
    ],
    default: [],
  })
  members: IMember[];

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User', required: true },
        date: { type: Date, default: Date.now, required: true },
      },
    ],
    default: [],
  })
  blockedUsers: IBlockedUser[];
}

export const ClubSchema = SchemaFactory.createForClass(Club);
