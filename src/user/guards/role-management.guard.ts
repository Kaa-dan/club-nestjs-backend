import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Observable } from "rxjs";
import { ChapterMember } from "src/shared/entities/chapters/chapter-member";
import { ClubMembers } from "src/shared/entities/clubmembers.entitiy";
import { NodeMembers } from "src/shared/entities/node-members.entity";

@Injectable()
export class RoleManagementGuard implements CanActivate {
    constructor(
        @InjectModel(ClubMembers.name) private readonly clubMembersModel: Model<ClubMembers>,
        @InjectModel(NodeMembers.name) private readonly nodeMembersModel: Model<NodeMembers>,
        @InjectModel(ChapterMember.name) private readonly chapterMemberModel: Model<ChapterMember>,
    ) { }

    async canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const userId = request.user._id;
        const { entity, entityId } = request.body;

        if (!entity || !entityId) {
            throw new Error('Missing entity or entityId');
        }

        const entityMemberData = await this.getMemberData(entity, userId);

        if (!entityMemberData) {
            throw new Error(`You are not a member of this ${entity}`);
        }

        const requiredRoles = this.getRequiredRoles(context);

        if (requiredRoles.includes(entityMemberData.role)) {
            request['role'] = entityMemberData.role;
            return true; // User's role is in the allowed roles for this route
        }

        throw new ForbiddenException('Access denied: You do not have sufficient privileges');
    }

    private async getMemberData(entity: string, userId: string) {
        try {

            if (entity === 'node') {
                return await this.nodeMembersModel.findOne({ userId: new Types.ObjectId(userId) });
            } else if (entity === 'club') {
                return await this.clubMembersModel.findOne({ userId: new Types.ObjectId(userId) });
            } else if (entity === 'chapter') {
                return await this.chapterMemberModel.findOne({ user: new Types.ObjectId(userId) });
            }

            return null;

        } catch (error) {
            throw error;
        }
    }

    private getRequiredRoles(context: ExecutionContext): string[] {
        const handler = context.getHandler();
        const classRef = context.getClass();

        const roles = Reflect.getMetadata('roles', handler) || Reflect.getMetadata('roles', classRef) || [];

        return roles;
    }
}