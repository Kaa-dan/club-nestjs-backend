import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.entity';
import { RulesRegulations } from './rules-regulations.entity';
import { Comment } from './comment.entity';

// Create a mapping for model references
const MODEL_REFS = {
  [RulesRegulations.name]: RulesRegulations.name,
  [Comment.name]: Comment.name
} as const;

@Schema({ timestamps: true })
export class Reports extends Document {
  @Prop({
    type: String,
    required: true,
    enum: [RulesRegulations.name, Comment.name],
  })
  type: typeof RulesRegulations.name | typeof Comment.name;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  reportedBy: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    //  dynamically reference different collections
    refPath: 'typeModel',
  })
  typeId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    ref: function (this: Reports) {
      return MODEL_REFS[this.type];
    },
    // Map type to corresponding model names
    enum: [RulesRegulations.name, Comment.name],
  })
  typeModel: Types.ObjectId;

  @Prop({ type: String, required: true })
  reason: string;

  @Prop({})
  file: string[];
}

// Helper method to get model name based on type
// export function getModelNameForType(
//   type: typeof RulesRegulations.name | typeof Comment.name,
// ): string {
//   const typeToModel = {
//     [RulesRegulations.name]: RulesRegulations.name,
//     [Comment.name]: Comment.name
//   };
//   return typeToModel[type];
// }

// Create schema
export const ReportsSchema = SchemaFactory.createForClass(Reports);

// Add pre-save middleware to automatically set typeModel based on type
// ReportsSchema.pre('save', function (next) {
//   if (this.type) {
//     this.typeModel = getModelNameForType(this.type);
//   }
//   next();
// });
