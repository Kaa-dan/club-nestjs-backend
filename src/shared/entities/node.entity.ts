import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { User } from './user.entity';

export interface IBlockedUser {
  userId: Types.ObjectId;
  date: Date;
}

@Schema({
  timestamps: true,
})
export class Node_ extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({
    type: {
      filename: { type: SchemaTypes.String, required: true },
      url: { type: SchemaTypes.String, required: true },
    },
    _id: false,
    required: true,
  })
  profileImage: {
    filename: string;
    url: string;
  };

  @Prop({
    type: {
      filename: { type: SchemaTypes.String, required: true },
      url: { type: SchemaTypes.String, required: true },
    },
    _id: false,
    required: true,
  })
  coverImage: {
    filename: string;
    url: string;
  };

  @Prop({ required: true })
  about: string;

  @Prop({ required: true })
  description: string;

  @Prop({
    type: [
      {
        user: { type: Types.ObjectId, ref: User.name, required: true },
        date: { type: Date, default: Date.now, required: true },
      },
    ],
    default: [],
  })
  blockedUsers: IBlockedUser[];

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  createdBy: Types.ObjectId;

  @Prop({ default: false })
  isVerified?: boolean;

  //link for joining the node
  @Prop({ required: true, unique: true, type: String })
  link: string;

  @Prop({ required: false })
  location: string;
}

export const NodeSchema = SchemaFactory.createForClass(Node_);
