import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, SchemaTypes, Types } from "mongoose";
import { Club } from "../club.entity";
import { Node_ } from "../node.entity";
import { User } from "../user.entity";

export interface IVote {
    user: Types.ObjectId;
    date: Date;
}

@Schema({ timestamps: true })
export class Chapter extends Document {
    @Prop({ required: true })
    name: string

    @Prop({ required: true })
    about: string

    @Prop({ required: true })
    description: string

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

    @Prop({ enum: ['proposed', 'published', 'rejected'], required: true })
    status: 'proposed' | 'published' | 'rejected'

    @Prop({ type: String, required: function () { return this.status === 'rejected' } })
    rejectedReason: string

    @Prop({ type: Types.ObjectId, ref: User.name, required: function () { return this.status === 'rejected' } })
    rejectedBy: Types.ObjectId

    @Prop({ type: Types.ObjectId, ref: User.name, required: true })
    proposedBy: Types.ObjectId

    @Prop({ type: Types.ObjectId, ref: User.name, required: function () { return this.status === 'published' } })
    publishedBy: Types.ObjectId

    @Prop({ type: Boolean, default: false })
    isDeleted: boolean

    @Prop([
        {
            user: { type: Types.ObjectId, ref: User.name },
            date: { type: Date, default: Date.now },
        },
    ])
    upvotes: IVote[];

    @Prop([
        {
            user: { type: Types.ObjectId, ref: User.name },
            date: { type: Date, default: Date.now },
        },
    ])
    downvotes: IVote[];
}

export const ChapterSchema = SchemaFactory.createForClass(Chapter);