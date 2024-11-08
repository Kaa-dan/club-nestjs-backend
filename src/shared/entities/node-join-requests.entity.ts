import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  collection: 'nodejoinrequests',
  timestamps: true,
})
export class NodeJoinRequest extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'users' })
  user: Types.ObjectId | string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'nodes' })
  node: Types.ObjectId | string;

  @Prop({ required: true })
  status: 'REQUESTED' | 'ACCEPTED' | 'REJECTED';

  rejectedDate: Date;

}

export const NodeJoinRequestSchema =
  SchemaFactory.createForClass(NodeJoinRequest);
