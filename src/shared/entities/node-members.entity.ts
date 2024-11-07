import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model, Types } from 'mongoose';

@Schema({ collection: 'nodemembers', timestamps: true })
export class NodeMembers extends Document {
  @Prop({ type: Types.ObjectId, ref: 'nodes', required: true })
  node: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'users', required: true })
  user: Types.ObjectId;

  @Prop({ required: true, enum: ['admin', 'moderator', 'member'] })
  role: 'admin' | 'moderator' | 'member';
  @Prop({ required: true })
  status: 'MEMBER' | 'BLOCKED';

  @Prop({ required: true, enum: [1, 2, 3, null] })
  pinned: 1 | 2 | 3 | null;
}

export const NodeMembersSchema = SchemaFactory.createForClass(NodeMembers);
