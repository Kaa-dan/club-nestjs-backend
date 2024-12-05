import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Parameter extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  project: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  value: string;

  @Prop({ required: true })
  unit: string;
}

export const ParameterSchema = SchemaFactory.createForClass(Parameter);
