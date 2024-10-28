import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class User extends Document {
  @Prop({ trim: true })
  userName: string;

  @Prop({ required: true, trim: true })
  email: string;

  @Prop()
  password: string;

  @Prop({ required: false, trim: true })
  firstName: string;

  @Prop({ required: false, trim: true })
  lastName: string;

  @Prop({ required: false, trim: true })
  phoneNumber: string;

  @Prop({
    type: Date,
    required: false,
    validate: {
      validator: (value: Date) => value < new Date(),
      message: 'Date of birth must be in the past',
    },
  })
  dateOfBirth: Date;

  @Prop({ enum: ['male', 'female', 'other'] })
  gender: string;

  @Prop({ required: false })
  profileImage: string;

  @Prop({ required: false })
  coverImage: string;

  @Prop({ default: false })
  isBlocked: boolean;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ default: false })
  registered: boolean;
  @Prop({
    type: String,
    enum: ['google', 'apple', 'facebook', 'gmail'],
    default: 'gmail',
    required: true,
  })
  signupThrough: string;
  @Prop({ default: false })
  isOnBoarded: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
