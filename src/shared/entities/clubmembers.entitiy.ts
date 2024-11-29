import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, SchemaType } from 'mongoose';
import { Club } from './club.entity';
import { User } from './user.entity';

@Schema({ timestamps: true })
export class ClubMembers extends Document {
  //club reference
  @Prop({ type: Types.ObjectId, ref: Club.name, required: true })
  club: Types.ObjectId;

  //user reference
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user: Types.ObjectId;

  @Prop({ required: true, enum: ['admin', 'moderator', 'member', 'owner'] })
  role: 'admin' | 'moderator' | 'member' | 'owner';

  @Prop({ required: true })
  status: 'MEMBER' | 'BLOCKED';

  //pinned
  @Prop({ default: null, enum: [1, 2, 3, null] })
  pinned: 1 | 2 | 3 | null;
}

export const ClubMembersSchema = SchemaFactory.createForClass(ClubMembers);
