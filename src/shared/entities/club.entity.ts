import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SchemaTypes } from 'mongoose';

export enum MemberRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member',
}

// Interface for members
export interface IMember {
  userId: Types.ObjectId;
  role: MemberRole;
  designation: string;
  date: Date;
}

// Interface for blocked members
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

  @Prop({
    type: {
      filename: { type: SchemaTypes.String, required: true },
      url: { type: SchemaTypes.String, required: true },
    },
    _id: false,
    required: true,
  })
  profileImage: {
    filename: string;
    url: string;
  };

  @Prop({
    type: {
      filename: { type: SchemaTypes.String, required: true },
      url: { type: SchemaTypes.String, required: true },
    },
    _id: false,
    required: true,
  })
  coverImage: {
    filename: string;
    url: string;
  };

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
  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User', required: true },
        date: { type: Date, default: Date.now, required: true },
      },
    ],
    default: [],
  })

  //link for joining the club
  @Prop({ required: true })
  link: string;

  //reference of the user who created the club
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const ClubSchema = SchemaFactory.createForClass(Club);
