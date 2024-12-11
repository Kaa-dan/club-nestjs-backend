import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { User } from "../user.entity";
import { Contribution } from "./contribution.entity";

@Schema({ timestamps: true })

export class ProjectActivities extends Document {

    @Prop({ required: true, ref: User.name })
    author: Types.ObjectId

    @Prop({ default: Date.now() })
    date: Date

    @Prop({ default: "contribution" })
    activityType: "contribution"

    @Prop({ required: true, ref: Contribution.name })
    contribution: Types.ObjectId

}

export const ProjectActivitiesSchema = SchemaFactory.createForClass(ProjectActivities)