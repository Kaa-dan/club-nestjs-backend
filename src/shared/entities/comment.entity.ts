import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { User } from "./user.entity";
import { Club } from "./club.entity";
import { Node_ } from "./node.entity";
import { RulesRegulations } from "./rules-requlations.entity";
import { Issues } from "./issues.entity";

interface IEntity {
    entityId: Types.ObjectId;
    entityType: typeof Node_.name | typeof Club.name | typeof RulesRegulations.name | typeof Issues.name;
}

interface IAttachment {
    url: string;
    type: 'image' | 'file';
    filename: string;
}

@Schema({ timestamps: true })
export class Comment extends Document {
    @Prop({ required: true, trim: true, type: String })
    content: string

    @Prop({
        type: {
            entityId: { type: Types.ObjectId, required: true, refPath: 'entity.entityType' },
            entityType: { type: String, enum: [Node_.name, Club.name, RulesRegulations.name, Issues.name], required: true },
        },
        _id: false,
        required: true,
    })
    entity: IEntity

    @Prop({ required: false, type: Types.ObjectId, ref: Comment.name, default: null })
    parent?: Types.ObjectId

    @Prop({ required: true, type: Types.ObjectId, ref: User.name })
    author: Types.ObjectId

    @Prop({ type: [Types.ObjectId], default: [], required: false })
    dislike?: Types.ObjectId[];

    @Prop({ type: [Types.ObjectId], default: [], required: false })
    like?: Types.ObjectId[];

    @Prop({ required: false, default: false, type: Boolean })
    isDeleted?: boolean

    @Prop({
        type: {
            url: String,
            filename: String,
            mimetype: String,
        },
        _id: false,
    })
    attachment?: IAttachment;
}

export const CommentSchema = SchemaFactory.createForClass(Comment)