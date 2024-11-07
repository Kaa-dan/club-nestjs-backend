import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { NodeMembers } from "src/shared/entities/node-members.entity";

@Injectable()
export class NodeRoleGuard implements CanActivate {
    constructor(@InjectModel(NodeMembers.name) private readonly nodeMembersModel: Model<NodeMembers>) { }

    async canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const userId = request.user._id;
        const nodeId = request.params.id;

        const nodeMember = await this.nodeMembersModel.findOne({ user: userId, node: nodeId });

        if (!nodeMember) {
            throw new NotFoundException('Node account not found')
        }

        const requiredRoles = this.getRequiredRoles(context);

        if (requiredRoles.includes(nodeMember.role)) {
            return true; // User's role is in the allowed roles for this route
        }

        throw new ForbiddenException('Access denied: You do not have sufficient privileges');
    }

    private getRequiredRoles(context: ExecutionContext): string[] {
        // Retrieve the required roles from metadata or decorators
        const handler = context.getHandler();
        const classRef = context.getClass();

        // Get roles metadata from the route handler or class (you will define this yourself)
        const roles = Reflect.getMetadata('roles', handler) || Reflect.getMetadata('roles', classRef) || [];

        return roles;
    }
}