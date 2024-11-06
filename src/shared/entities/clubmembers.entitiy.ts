import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, SchemaType } from 'mongoose';

@Schema({ collection: 'clubmembers', timestamps: true })
export class ClubMembers extends Document {
  //club reference
  @Prop({ type: Types.ObjectId, ref: 'Club', required: true })
  club: Types.ObjectId;

  //user reference
  @Prop({ type: Types.ObjectId, ref: 'users', required: true })
  user: Types.ObjectId;

  @Prop({ required: true, enum: ['admin', 'moderator', 'member'] })
  role: 'admin' | 'moderator' | 'member';

  @Prop({ required: true })
  status: 'MEMBER' | 'BLOCKED';

  //pinned
  @Prop({ default: null, enum: [1, 2, 3, null] })
  pinned: 1 | 2 | 3 | null;
}

export const ClubMembersSchema = SchemaFactory.createForClass(ClubMembers);
