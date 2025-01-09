import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { ChapterMember } from "src/shared/entities/chapters/chapter-member.entity";

@Injectable()
export class ChapterRoleGuard implements CanActivate {
    constructor(@InjectModel(ChapterMember.name) private readonly chapterMemberModel: Model<ChapterMember>) { }

    async canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const userId = new Types.ObjectId(request.user._id);
        const chapterId = request.query.chapter || request.body.chapter;

        const chapterMember = await this.chapterMemberModel.findOne({
            user: userId,
            chapter: new Types.ObjectId(chapterId)
        });

        if (!chapterMember) {
            throw new Error('You are not a member of this chapter');
        }

        const requiredRoles = this.getRequiredRoles(context);

        if (requiredRoles.includes(chapterMember.role)) {
            request['role'] = chapterMember.role;
            return true;
        }

        throw new ForbiddenException('Access denied: You do not have sufficient privileges');
    }

    private getRequiredRoles(context: ExecutionContext): string[] {
        const handler = context.getHandler();
        const classRef = context.getClass();

        const roles = Reflect.getMetadata('roles', handler) || Reflect.getMetadata('roles', classRef) || [];

        return roles;
    }
}
