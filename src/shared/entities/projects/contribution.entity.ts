import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Project } from './project.entity';
import { User } from '../user.entity';
import { Club } from '../club.entity';
import { Node_ } from '../node.entity';
import { Parameter } from './parameter.entity';

@Schema({ timestamps: true })
export class Contribution {
  @Prop({ type: Types.ObjectId, ref: Project.name, required: true })
  rootProject: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: Project.name })
  project: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: Parameter.name })
  parameter: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: User.name })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: Club.name })
  club: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: Node_.name })
  node: Types.ObjectId;

  @Prop({ type: Number, required: true })
  value: number;

  @Prop({
    type: [
      {
        url: String,
        originalname: String,
        mimetype: String,
        size: Number,
      },
    ],
  })
  files: { url: string; originalname: string; size: number }[];

  @Prop({
    type: String,
    enum: ['accepted', 'pending', 'rejected'],
    default: 'pending',
  })
  status: string;
}

export const ContributionSchema = SchemaFactory.createForClass(Contribution);
