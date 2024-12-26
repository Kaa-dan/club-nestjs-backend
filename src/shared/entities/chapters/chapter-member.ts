import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { Chapter } from "./chapter.entity";
import { User } from "../user.entity";

@Schema({ timestamps: true })
export class ChapterMember extends Document {
    @Prop({ type: Types.ObjectId, ref: Chapter.name, required: true })
    chapter: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: User.name, required: true })
    user: Types.ObjectId;

    @Prop({ required: true, enum: ['owner', 'admin', 'moderator', 'member'] })
    role: 'owner' | 'admin' | 'moderator' | 'member'

    @Prop({ required: true })
    status: 'MEMBER' | 'BLOCKED';
}

export const ChapterMemberSchema = SchemaFactory.createForClass(ChapterMember);