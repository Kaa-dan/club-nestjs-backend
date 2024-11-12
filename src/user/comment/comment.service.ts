import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment } from 'src/shared/entities/comment.entity';
import { CreateCommentDto, entities } from './dto/comment.dto';

@Injectable()
export class CommentService {
    constructor(@InjectModel(Comment.name) private readonly commentModel: Model<Comment>) { }

    async getAllComments() {
        return await this.commentModel
            .find()
            .populate('parent')
            .populate('author')
            .populate({
                path: 'entity.entityId',
                refPath: 'entity.entityType',
            } as any)
            .exec()
    }

    async createComment(createCommentDto: CreateCommentDto, userId: Types.ObjectId) {
        try {
            if (!entities.includes(createCommentDto.entityType)) {
                throw new BadRequestException("Invalid entity type")
            }

            if (!Types.ObjectId.isValid(createCommentDto.entityId)) {
                throw new BadRequestException("Invalid entityId")
            }

            console.log("createCommentDto", createCommentDto);
            const entity = {
                entityId: new Types.ObjectId(createCommentDto.entityId),
                entityType: createCommentDto.entityType
            }
            const commentData = {
                ...createCommentDto,
                entity,
                parent: createCommentDto.parent ? new Types.ObjectId(createCommentDto.parent) : null,
                author: userId,
            }
            const comment = await this.commentModel.create({
                ...commentData
            })

            await comment.save()
            return comment;
        } catch (error) {
            console.log(error)
            if (error instanceof BadRequestException) {
                throw error
            }
            throw new BadRequestException("Failed to create comment")
        }
    }
}
