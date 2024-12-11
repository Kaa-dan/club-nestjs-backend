import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IsOptional } from "class-validator";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class ProjectAnnouncement extends Document {

    @Prop({ required: true, type: String })
    announcement: string

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
    files?: {
        url: String,
        originalname: String,
        mimetype: String,
        size: Number
    }[]

    @Prop({ required: true })
    project: Types.ObjectId

}


export const ProjectAnnouncementSchema = SchemaFactory.createForClass(ProjectAnnouncement)
