import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'reports', timestamps: true })
export class Reports extends Document {
  @Prop({
    type: String,
    required: true,
    enum: ['rules', 'comment', 'debate'],
  })
  type: 'rules' | 'comment' | 'debate';

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reportedBy: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    //  dynamically reference different collections
    refPath: 'typeModel',
  })
  typeId: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    // Map type to corresponding model names
    enum: ['rulesandregulations', 'Comment', 'Debate'],
  })
  typeModel: string;
}

// Helper method to get model name based on type
export function getModelNameForType(
  type: 'rules' | 'comment' | 'debate',
): string {
  const typeToModel = {
    rules: 'rulesandregulations',
    comment: 'Comment',
    debate: 'Debate',
  };
  return typeToModel[type];
}

// Create schema
export const ReportsSchema = SchemaFactory.createForClass(Reports);

// Add pre-save middleware to automatically set typeModel based on type
ReportsSchema.pre('save', function (next) {
  if (this.type) {
    this.typeModel = getModelNameForType(this.type);
  }
  next();
});
