import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class User extends Document {
  @Prop()
  userName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  password: string;

  @Prop({ required: false })
  firstName: string;

  @Prop({ required: false })
  lastName: string;

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
}

export const UserSchema = SchemaFactory.createForClass(User);
