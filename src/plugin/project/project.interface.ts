import { Types } from "mongoose";

export interface Project {

}

export interface PopulatedProject {
    _id: Types.ObjectId;
    createdBy: Types.ObjectId;
}
