import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, SchemaTypes, Types } from "mongoose";
import { Club } from "../club.entity";
import { Node_ } from "../node.entity";
import { User } from "../user.entity";

@Schema({ timestamps: true })
export class Chapter extends Document {
    @Prop({ required: true })
    name: string

    @Prop({
        type: {
            filename: { type: SchemaTypes.String, required: true },
            url: { type: SchemaTypes.String, required: true },
        },
        _id: false,
        required: true,
    })
    profileImage: {
        filename: string;
        url: string;
    };

    @Prop({
        type: {
            filename: { type: SchemaTypes.String, required: true },
            url: { type: SchemaTypes.String, required: true },
        },
        _id: false,
        required: true,
    })
    coverImage: {
        filename: string;
        url: string;
    };


    @Prop({ type: Types.ObjectId, ref: Club.name, required: true })
    club: Types.ObjectId

    @Prop({ type: Types.ObjectId, ref: Node_.name, required: true })
    node: Types.ObjectId

    @Prop({ enum: ['proposed', 'published'], required: true })
    status: 'proposed' | 'published'

    @Prop({ type: Types.ObjectId, ref: User.name, required: true })
    proposedBy: Types.ObjectId

    @Prop({ type: Types.ObjectId, ref: User.name })
    publishedBy: Types.ObjectId
}

export const ChapterSchema = SchemaFactory.createForClass(Chapter);