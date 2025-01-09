import { Types } from "mongoose";
import { Chapter } from "../chapter.entity";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { RulesRegulations } from "../../rules-regulations.entity";

@Schema({ timestamps: true })
export class ChapterRulesRegulations {
    @Prop({ required: true, type: Types.ObjectId, ref: Chapter.name })
    chapter: Types.ObjectId

    @Prop({
        type: String,
        enum: ['published', 'inactive'],
        default: 'published'
    })
    status: "published" | "inactive"

    @Prop({ required: true, type: Types.ObjectId, ref: RulesRegulations.name })
    rulesRegulation: Types.ObjectId
}

export const ChapterRulesRegulationsSchema = SchemaFactory.createForClass(ChapterRulesRegulations)