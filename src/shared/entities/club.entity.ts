import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SchemaTypes } from 'mongoose';
import { User } from './user.entity';

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

  //link for joining the club
  @Prop({ required: false, unique: false, type: String })
  link: string;

  //reference of the user who created the club
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  createdBy: Types.ObjectId;
}

export const ClubSchema = SchemaFactory.createForClass(Club);
