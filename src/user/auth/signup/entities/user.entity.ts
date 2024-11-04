// user.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export class ImageData {
  url: string;
  public_id: string;
}

@Schema()
export class User extends Document {
  @Prop()
  userName: string;

  @Prop({ required: true , unique:true})
  email: string;

  @Prop()
  password: string;

  @Prop({ required: false })
  firstName: string;

  @Prop({ required: false })
  lastName: string;

  @Prop({ required: false })
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

  @Prop({
    type: {
      url: String,
      public_id: String,
    },
    required: false,
    _id: false,
  })
  profileImage?: ImageData;

  @Prop({
    type: {
      url: String,
      public_id: String,
    },
    required: false,
    _id: false,
  })
  coverImage?: ImageData;

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

  @Prop({
    type: String,
    enum: ['details', 'image', 'interest', 'node'],
    default: 'details',
    required: true,
  })
  onBoardingStage: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
