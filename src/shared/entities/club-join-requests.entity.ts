import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, SchemaType } from 'mongoose';

@Schema({ collection: 'clubjoinrequests', timestamps: true })
export class ClubJoinRequests extends Document {
  //club reference
  @Prop({ type: Types.ObjectId, ref: 'Club', required: true })
  club: Types.ObjectId;

  //user reference
  @Prop({ type: Types.ObjectId, ref: 'users', required: true })
  user: Types.ObjectId;

  @Prop({ required: true, enum: ['admin', 'moderator', 'member'] })
  role: 'admin' | 'moderator' | 'member';

  @Prop({ required: true })
  status: 'REQUESTED' | 'ACCEPTED' | 'REJECTED';

  rejectedDate: Date;
}

export const ClubJoinRequestsSchema =
  SchemaFactory.createForClass(ClubJoinRequests);
