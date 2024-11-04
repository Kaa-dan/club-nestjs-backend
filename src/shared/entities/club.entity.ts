import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { Document, Types } from 'mongoose';

enum MemberRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member',
}

//type for members
interface IMember {
  userID: Types.ObjectId;
  role: MemberRole;
  designation: string;
  date: Date;
}

//type for blocked members
interface IBlockedUser {
  userId: Types.ObjectId;
  date: Date;
}

//schema

@Schema({
  collection: 'clubs',
})
export class Club extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  about: string;

  @Prop({ required: true })
  decription: string;

  @Prop({ required: true })
  profileImage: string;

  @Prop({ required: true })
  coverImage: string;

  @Prop({ required: true })
  isPublic: boolean;

  //group members
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
      },
    ],
    default: [],
  })
  members: IMember[];

  //memebers who are blocked with  date
  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User', required: true },
        date: { type: Date, required: true },
      },
    ],
    default: [],
  })
  blockedUsers: IBlockedUser[];
}

export const ClubSchema = SchemaFactory.createForClass(Club);
