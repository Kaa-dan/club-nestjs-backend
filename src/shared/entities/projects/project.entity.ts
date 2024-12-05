import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsDate,
  IsArray,
  IsBoolean,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';
import { Node_ } from '../node.entity';
import { Club } from '../club.entity';
import { User } from '../user.entity';

// Nested subdocument for banner image

// Nested subdocument for committees and champions
class TeamMember {
  @IsMongoId()
  user: Types.ObjectId;

  @IsString()
  designation: string;
}
//type for budget
type Budget = { from: number; to: number; currency: string };

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    getters: true,
  },
  toObject: {
    virtuals: true,
    getters: true,
  },
})
export class Project {
  @Prop({ type: Types.ObjectId, ref: Club.name })
  @IsOptional()
  club: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Node_.name })
  @IsOptional()
  node: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  })
  @IsString()
  @IsOptional()
  title: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50,
  })
  @IsString()
  @IsOptional()
  region: string;

  @Prop({
    type: Object,
    min: 0,
    default: 0,
  })
  @IsOptional()
  budget: Budget;

  @Prop({ type: Date })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  deadline: Date;

  @Prop({
    type: String,
    trim: true,
    maxlength: 500,
  })
  @IsString()
  @IsOptional()
  significance: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: 1000,
  })
  @IsString()
  @IsOptional()
  solution: string;

  @Prop({ type: Object })
  @IsOptional()
  bannerImage: any;

  @Prop({ type: [Object] })
  @IsArray()
  @Type(() => TeamMember)
  @IsOptional()
  committees: TeamMember[];

  @Prop({ type: [Object] })
  @IsArray()
  @Type(() => TeamMember)
  champions: TeamMember[];

  @Prop({
    type: String,
    trim: true,
    maxlength: 1000,
  })
  @IsString()
  @IsOptional()
  aboutPromoters: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: 500,
  })
  @IsString()
  @IsOptional()
  fundingDetails: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: 500,
  })
  @IsString()
  @IsOptional()
  keyTakeaways: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: 1000,
  })
  @IsString()
  @IsOptional()
  risksAndChallenges: string;

  @IsString()
  @Prop({
    type: String,
    enum: ['draft', 'published', 'proposed', 'rejected', 'inactive'],
    default: 'draft',
  })
  status: string;

  @Prop({ type: Boolean })
  @IsBoolean()
  @IsOptional()
  active: boolean;

  @Prop({ type: [Object] })
  @IsArray()
  @IsOptional()
  files: any[];

  @Prop({ type: Types.ObjectId, ref: User.name })
  @IsOptional()
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  @IsOptional()
  publishedBy: Types.ObjectId | null;
}

//Mongoose schema
export const ProjectSchema = SchemaFactory.createForClass(Project);
