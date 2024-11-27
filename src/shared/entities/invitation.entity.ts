import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IsString, IsDate } from 'class-validator';
import { Club } from './club.entity';
import { User } from './user.entity';
import { Node_ } from './node.entity';

@Schema({ timestamps: true })
export class Invitation extends Document {
  @Prop({ type: Types.ObjectId, ref: Club.name })
  club: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Node_.name })
  node: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user: Types.ObjectId;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isRevoked: boolean;

  @Prop({ default: false })
  isUsed: boolean;
}

export const InvitationSchema = SchemaFactory.createForClass(Invitation);

export class CreateInvitationDto {
  @IsString()
  clubId: string;

  @IsDate()
  expiresAt: Date;
}
