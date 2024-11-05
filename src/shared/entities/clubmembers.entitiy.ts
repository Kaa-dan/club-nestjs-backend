import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, SchemaType } from 'mongoose';

@Schema({ collection: 'clubmembers', timestamps: true })
export class ClubMembers extends Document {
  //club reference
  @Prop({ type: Types.ObjectId, ref: 'Club', required: true })
  club: Types.ObjectId;

  //user reference
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ required: true })
  role: string;

  @Prop({ required: true })
  status: 'REQUESTED' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
}

export const ClubMembersSchema = SchemaFactory.createForClass(ClubMembers);
