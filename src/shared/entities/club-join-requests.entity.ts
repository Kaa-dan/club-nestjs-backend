import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, SchemaType } from 'mongoose';
import { Club } from './club.entity';
import { User } from './user.entity';

@Schema({ timestamps: true })
export class ClubJoinRequests extends Document {
  //club reference
  @Prop({ type: Types.ObjectId, ref: Club.name, required: true })
  club: Types.ObjectId;

  //user reference
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user: Types.ObjectId;

  @Prop({ required: true, enum: ['admin', 'moderator', 'member'] })
  role: 'admin' | 'moderator' | 'member';

  @Prop({ required: true })
  status: 'REQUESTED' | 'ACCEPTED' | 'REJECTED' | 'LEFT';

  rejectedDate: Date;

  leftDate: Date;
}

export const ClubJoinRequestsSchema =
  SchemaFactory.createForClass(ClubJoinRequests);
