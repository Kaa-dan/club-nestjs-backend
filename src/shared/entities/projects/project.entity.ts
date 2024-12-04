import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsDate,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';
import { Node_ } from '../node.entity';
import { Club } from '../club.entity';

// Nested subdocument for banner image
class BannerImage {
  @IsString()
  filename: string;

  @IsString()
  url: string;
}

// Nested subdocument for committees and champions
class TeamMember {
  @IsString()
  name: string;

  @IsString()
  designation: string;
}
//type for budget
type Budget = { from: number; to: number; currency: string };

class File {
  @IsString()
  filename: string;

  @IsString()
  url: string;
}

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
  club: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Node_.name })
  node: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  })
  @IsString()
  title: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50,
  })
  @IsString()
  region: string;

  @Prop({
    type: Number,
    min: 0,
    default: 0,
  })
  @Prop({ required: true, type: Object })
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
  @Type(() => BannerImage)
  bannerImage: BannerImage;

  @Prop({ type: [Object] })
  @IsArray()
  @Type(() => TeamMember)
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
    enum: ['draft', 'published', 'proposed', 'rejected'],
    default: 'draft',
  })
  status: string;

  @Prop({ type: [Object] })
  @IsArray()
  @Type(() => File)
  files: File[];
}

//Mongoose schema
export const ProjectSchema = SchemaFactory.createForClass(Project);
