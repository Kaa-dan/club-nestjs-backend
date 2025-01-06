import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../user.entity';
import { Project } from './project.entity';

@Schema({
  timestamps: true,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true },
})
export class ProjectFaq {
  @Prop({ type: Types.ObjectId, required: true, ref: Project.name })
  project: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: ['proposed', 'approved', 'rejected'],
  })
  status: string;

  @Prop({ type: String, required: false, trim: true })
  answer: string;

  @Prop({ type: String, required: true, trim: true })
  question: string;

  @Prop({ type: Types.ObjectId, required: true, ref: User.name })
  askedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: false, ref: User.name })
  answeredBy: Types.ObjectId;

  @Prop({ type: Date, required: true })
  Date: Date;
}

export type ProjectFaqDocument = HydratedDocument<ProjectFaq>;
export const ProjectFaqSchema = SchemaFactory.createForClass(ProjectFaq);
