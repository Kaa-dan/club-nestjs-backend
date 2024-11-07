import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { ClubMembers } from "src/shared/entities/clubmembers.entitiy";

@Injectable()
export class ClubRoleGuard implements CanActivate {
    constructor(@InjectModel(ClubMembers.name) private readonly clubMembersModel: Model<ClubMembers>) {}

    async canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const userId = new Types.ObjectId(request.user._id);
        const clubId = new Types.ObjectId(request.params.id);

        
        console.log(userId,"userId")
        const clubMember = await this.clubMembersModel.findOne({ user: userId, club: clubId });

        if(!clubMember){
            throw new NotFoundException('Club account not found')
        }

        const requiredRoles = this.getRequiredRoles(context);

        if (requiredRoles.includes(clubMember.role)) {
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