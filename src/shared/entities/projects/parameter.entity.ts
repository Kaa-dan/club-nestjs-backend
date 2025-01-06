import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Project } from './project.entity';

@Schema({ timestamps: true })
export class ProjectParameter extends Document {
  @Prop({ type: Types.ObjectId, ref: Project.name, required: true })
  project: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  value: string;

  @Prop({ required: true })
  unit: string;

}

export const ProjectParameterSchema = SchemaFactory.createForClass(ProjectParameter);
