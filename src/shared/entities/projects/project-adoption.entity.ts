import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { User } from '../user.entity';
import { Project } from './project.entity';

@Schema({
  timestamps: true,
})
export class ProjectAdoption {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  proposedBy: Types.ObjectId

  @Prop({ required: false, type: Types.ObjectId, ref: User.name })
  acceptedBy: Types.ObjectId

  @Prop({ required: true, type: Types.ObjectId, ref: Project.name })
  project: Types.ObjectId
}
