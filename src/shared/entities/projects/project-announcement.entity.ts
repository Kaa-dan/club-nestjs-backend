import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IsOptional } from "class-validator";
import { Document, Types } from "mongoose";
import { Project } from "./project.entity";
import { User } from "../user.entity";

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

    @Prop({ required: true, ref: Project.name })
    project: Types.ObjectId

    @Prop({ required: true, ref: User.name })
    user: Types.ObjectId

}


export const ProjectAnnouncementSchema = SchemaFactory.createForClass(ProjectAnnouncement)
