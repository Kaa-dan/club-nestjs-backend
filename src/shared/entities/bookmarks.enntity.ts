import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { User } from "./user.entity";
import { RulesRegulations } from "./rules-regulations.entity";
import { Issues } from "./issues.entity";
import { Project } from "./projects/project.entity";

interface IEntity {
    entityId: Types.ObjectId;
    entityType:
    | typeof RulesRegulations.name
    | typeof Issues.name
    | typeof Project.name;
}

@Schema({ timestamps: true })
export class Module extends Document {
    // title,
    // user,
    // posts: [
    //     {
    //         createdAt,
    //         postId,
    //         plugin,
    //     }
    // ]    
    @Prop({ required: true })
    title: string;

    @Prop({ required: true, type: Types.ObjectId, ref: User.name })
    user: Types.ObjectId;

    @Prop({
        type: [
            {
                createdAt: Date,
                entity: {
                    entityId: {
                        type: Types.ObjectId,
                        required: true,
                        refPath: 'entity.entityType',
                    },
                    entityType: {
                        type: String,
                        enum: [
                            RulesRegulations.name,
                            Issues.name,
                            Project.name,
                        ],
                        required: true,
                    },
                }
            }
        ]
    })
    posts: {
        createdAt: Date;
        entity: IEntity;
    }[];
}

export const ModuleSchema = SchemaFactory.createForClass(Module);