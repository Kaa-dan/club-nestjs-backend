import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

interface IEntity {
    ref: Types.ObjectId;
    entityType: 'post' | 'debate' | 'nodes' | 'Club';
}

interface IAttachment {
    url: string;
    type: 'image' | 'file';
    filename: string;
}

@Schema({ collection: 'comment', timestamps: true })
export class Comment extends Document {
    @Prop({ required: true, trim: true, type: String })
    content: string

    @Prop({
        type: {
            ref: { type: Types.ObjectId, required: true, refPath: 'entity.entityType' },
            entityType: { type: String, enum: ['post', 'debate', 'nodes', 'Club'], required: true },
        },
        required: true,
    })
    entity: IEntity

    @Prop({ required: false, type: Types.ObjectId, ref: 'Comment', default: null })
    parent: Types.ObjectId

    @Prop({ required: true, type: Types.ObjectId, ref: 'users' })
    author: Types.ObjectId

    @Prop({ type: [Types.ObjectId], default: [], required: false })
    irrelevant: Types.ObjectId[];

    @Prop({ type: [Types.ObjectId], default: [], required: false })
    relevant: Types.ObjectId[];

    @Prop({ required: false, default: false, type: Boolean })
    isDeleted: boolean

    @Prop({
        type: {
            url: { type: String, required: true },
            type: { type: String, enum: ['image', 'file'], required: true },
            filename: { type: String, required: true },
        },
        _id: false,
    })
    attachment?: IAttachment;
}

export const CommentSchema = SchemaFactory.createForClass(Comment)