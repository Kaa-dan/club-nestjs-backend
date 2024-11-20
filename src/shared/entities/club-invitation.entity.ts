import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IsString, IsDate } from 'class-validator';
import { Club } from './club.entity';
import { User } from './user.entity';

export type ClubInvitationDocument = ClubInvitation & Document;

@Schema({ timestamps: true })
export class ClubInvitation {
  @Prop({ type: Types.ObjectId, ref: Club.name, required: true })
  club: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user: Types.ObjectId;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isRevoked: boolean;

  @Prop({ default: false })
  isUsed: boolean;
}

export const ClubInvitationSchema =
  SchemaFactory.createForClass(ClubInvitation);

export class CreateInvitationDto {
  @IsString()
  clubId: string;

  @IsDate()
  expiresAt: Date;
}
