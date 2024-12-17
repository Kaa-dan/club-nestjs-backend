import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { Club } from "../club.entity";
import { Node_ } from "../node.entity";

@Schema({ timestamps: true })
export class Chapter extends Document {
    @Prop({ required: true })
    name: string

    @Prop({ type: Types.ObjectId, ref: Club.name, required: true })
    club: Types.ObjectId

    @Prop({ type: Types.ObjectId, ref: Node_.name, required: true })
    node: Types.ObjectId
}

export const ChapterSchema = SchemaFactory.createForClass(Chapter);