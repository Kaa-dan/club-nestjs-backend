import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";
import { Chapter } from "../chapter.entity";
import { Project } from "../../projects/project.entity";

@Schema({
    timestamps: true
})
export class ChapterProject {
    @Prop({ required: true, type: Types.ObjectId, ref: Chapter.name })
    chapter: Types.ObjectId

    @Prop({
        type: String,
        enum: ['published', 'inactive'],
        default: 'published'
    })
    status: string;

    @Prop({ required: true, type: Types.ObjectId, ref: Project.name })
    project: Types.ObjectId

    // CreatedAt
    createdAt: Date
}

export const ChapterProjectSchema = SchemaFactory.createForClass(ChapterProject)