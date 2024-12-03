import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Project } from './project.entity';

export class Parameter {
  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: [String, Number], required: true })
  value: string | number;

  @Prop({ type: String, required: true })
  unit: string;

  @Prop({ type: Types.ObjectId, required: true, ref: Project.name })
  project: Types.ObjectId;
}

export type ParameterDocument = HydratedDocument<Parameter>;
export const ParameterSchema = SchemaFactory.createForClass(Parameter);
