import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";
import { Club } from "./club.entity";
import { User } from "./user.entity";
import { RulesRegulations } from "./rules-requlations.entity";

@Schema({timestamps:true})
export class ProposeRulesAndRegulation{

@Prop({required:true,type:Types.ObjectId,ref:Club.name})
club :Types.ObjectId

@Prop({required:true,type:Types.ObjectId,ref:User.name})
proposedBy:Types.ObjectId

@Prop({required:true,type:Types.ObjectId,ref:RulesRegulations.name})
rulesAndRegulation:Types.ObjectId

@Prop({required:true,type:String,enum:['accepted','rejected','pending'],default:'pending'})
status:'accepted'|'rejected'|'pending'

}



//creating schema 
export const ProposeRulesAndRegulationSchema = SchemaFactory.createForClass(ProposeRulesAndRegulation)