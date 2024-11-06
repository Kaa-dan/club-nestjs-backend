import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class OTP extends Document {
  @Prop({ required: true, unique:true })
  email: string;

  @Prop({ required: true })
  otp: string;

  @Prop({ expires: '10m', default: Date.now })
  createdAt: Date;
}

export const OTPSchema = SchemaFactory.createForClass(OTP);
