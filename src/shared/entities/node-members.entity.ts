import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model, Types } from 'mongoose';
import { Node_ } from './node.entity';
import { User } from './user.entity';

@Schema({ timestamps: true })
export class NodeMembers extends Document {
  @Prop({ type: Types.ObjectId, ref: Node_.name, required: true })
  node: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user: Types.ObjectId;

  @Prop({ required: true, enum: ['owner', 'admin', 'moderator', 'member'] })
  role: 'owner' | 'admin' | 'moderator' | 'member';

  @Prop({ required: true })
  status: 'MEMBER' | 'BLOCKED';

  @Prop({ default: null, enum: [1, 2, 3, null] })
  pinned: 1 | 2 | 3 | null;
}

export const NodeMembersSchema = SchemaFactory.createForClass(NodeMembers);
