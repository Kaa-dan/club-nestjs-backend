import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { User } from '../user.entity';
import { Club } from '../club.entity';
import { Node_ } from '../node.entity';
import { IsString } from 'class-validator';
import { Issues } from './issues.entity';

@Schema({
    timestamps: true,
})
export class IssuesAdoption {
    @Prop({ required: true, type: Types.ObjectId, ref: User.name })
    proposedBy: Types.ObjectId

    @Prop({ required: false, type: Types.ObjectId, ref: User.name })
    acceptedBy: Types.ObjectId

    @Prop({ required: true, type: Types.ObjectId, ref: Issues.name })
    issues: Types.ObjectId

    @Prop({ required: false, type: Types.ObjectId, ref: Club.name })
    club: Types.ObjectId

    @Prop({ required: false, type: Types.ObjectId, ref: Node_.name })
    node: Types.ObjectId

    @Prop({ type: String })
    message: string

    @IsString()
    @Prop({
        type: String,
        enum: ['draft', 'published', 'proposed', 'rejected', 'inactive'],
        default: 'proposed',
    })
    status: string;

    @Prop({ type: String, default: 'adopted' })
    type: string
}


export const IssuesAdoptionSchema = SchemaFactory.createForClass(IssuesAdoption)