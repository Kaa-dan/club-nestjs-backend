import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment } from 'src/shared/entities/comment.entity';
import { CreateCommentDto, entities } from './dto/comment.dto';
import { UploadService } from 'src/shared/upload/upload.service';

@Injectable()
export class CommentService {
    constructor(@InjectModel(Comment.name) private readonly commentModel: Model<Comment>, private readonly s3FileUpload: UploadService) { }

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

    /**
     * Gets all comments for a given entity type and id.
     *
     * @param entityType The type of the entity.
     * @param entityId The id of the entity.
     * @returns The comments for the given entity.
     * @throws NotFoundException If no comments are found.
     */
    async getCommentsByEntity(entityType: string, entityId: Types.ObjectId) {
        try {
            if (entityType === null || entityType === undefined) {
                throw new BadRequestException('Invalid entity type');
            }
            if (!entities.includes(entityType)) {
                throw new BadRequestException('Invalid entity type');
            }
            if (entityId === null || entityId === undefined) {
                throw new BadRequestException('Invalid entityId');
            }

            const commentsData = await this.commentModel.aggregate([
                {
                    $match: {
                        'entity.entityId': new Types.ObjectId(entityId),
                        'entity.entityType': entityType,
                        parent: null,
                        isDeleted: { $ne: true } // Exclude deleted comments
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'author',
                        foreignField: '_id',
                        as: 'author'
                    }
                },
                {
                    $unwind: '$author'
                },
                {
                    $lookup: {
                        from: 'comments',
                        let: { commentId: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ['$parent', '$$commentId'] },
                                    isDeleted: { $ne: true } // Exclude deleted replies
                                }
                            },
                            {
                                $lookup: {
                                    from: 'users',
                                    localField: 'author',
                                    foreignField: '_id',
                                    as: 'author'
                                }
                            },
                            {
                                $unwind: '$author'
                            },
                            {
                                $project: {
                                    _id: 1,
                                    firstName: '$author.firstName',
                                    lastName: '$author.lastName',
                                    email: '$author.email',
                                    userName: '$author.userName',
                                    userId: '$author._id',
                                    content: 1,
                                    profileImage: '$author.profileImage',
                                    coverImage: '$author.coverImage',
                                    interests: '$author.interests',
                                    createdAt: 1,
                                    like: { $ifNull: ['$like', []] },
                                    dislike: { $ifNull: ['$dislike', []] },
                                    // likes: { $size: { $ifNull: ['$like', []] } },
                                    // dislikes: { $size: { $ifNull: ['$dislike', []] } },
                                    attachment: 1 // Include attachment in replies
                                }
                            }
                        ],
                        as: 'replies'
                    }
                },
                {
                    $project: {
                        _id: 1,
                        firstName: '$author.firstName',
                        lastName: '$author.lastName',
                        email: '$author.email',
                        userName: '$author.userName',
                        userId: '$author._id',
                        content: 1,
                        profileImage: '$author.profileImage',
                        coverImage: '$author.coverImage',
                        interests: '$author.interests',
                        createdAt: 1,
                        like: { $ifNull: ['$like', []] },
                        dislike: { $ifNull: ['$dislike', []] },
                        // likes: { $size: { $ifNull: ['$like', []] } },
                        // dislikes: { $size: { $ifNull: ['$dislike', []] } },
                        attachment: 1, // Include attachment in parent comments
                        replies: 1
                    }
                },
                {
                    $sort: { createdAt: -1 }
                }
            ]);

            return commentsData;
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException('Failed to get comments. Please try again later.');
        }
    }

    /**
     * Create a new comment on the given entity.
     *
     * @param createCommentDto The comment data.
     * @param userId The id of the user creating the comment.
     * @param file The file to be uploaded as an attachment.
     * @returns The created comment.
     * @throws BadRequestException If the entity type or id is invalid.
     * @throws BadRequestException If the file cannot be uploaded.
     */
    async createComment(createCommentDto: CreateCommentDto, userId: Types.ObjectId, file?: Express.Multer.File) {
        try {
            if (!entities.includes(createCommentDto.entityType)) {
                throw new BadRequestException("Invalid entity type");
            }

            if (!Types.ObjectId.isValid(createCommentDto.entityId)) {
                throw new BadRequestException("Invalid entityId");
            }

            if (file) {
                const uploadedFile = await this.s3FileUpload.uploadFile(file.buffer, file.originalname, file.mimetype, 'comment');
                if (uploadedFile) {
                    const attachment = { ...uploadedFile, mimetype: file.mimetype };
                    createCommentDto.attachment = attachment;
                }
            }

            const entity = {
                entityId: new Types.ObjectId(createCommentDto.entityId),
                entityType: createCommentDto.entityType
            };

            const commentData = {
                ...createCommentDto,
                entity,
                parent: createCommentDto.parent ? new Types.ObjectId(createCommentDto.parent) : null,
                author: userId,
            };

            const comment = new this.commentModel(commentData);
            await comment.save();

            const commentsData = await this.commentModel.aggregate([
                {
                    $match: {
                        'entity.entityId': new Types.ObjectId(createCommentDto.entityId),
                        'entity.entityType': createCommentDto.entityType,
                        parent: null,
                        isDeleted: { $ne: true } // Exclude deleted comments
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'author',
                        foreignField: '_id',
                        as: 'author'
                    }
                },
                {
                    $unwind: '$author'
                },
                {
                    $lookup: {
                        from: 'comments',
                        let: { commentId: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ['$parent', '$$commentId'] },
                                    isDeleted: { $ne: true } // Exclude deleted replies
                                }
                            },
                            {
                                $lookup: {
                                    from: 'users',
                                    localField: 'author',
                                    foreignField: '_id',
                                    as: 'author'
                                }
                            },
                            {
                                $unwind: '$author'
                            },
                            {
                                $project: {
                                    _id: 1,
                                    firstName: '$author.firstName',
                                    lastName: '$author.lastName',
                                    email: '$author.email',
                                    userName: '$author.userName',
                                    userId: '$author._id',
                                    content: 1,
                                    profileImage: '$author.profileImage',
                                    coverImage: '$author.coverImage',
                                    interests: '$author.interests',
                                    createdAt: 1,
                                    like: { $ifNull: ['$like', []] },
                                    dislike: { $ifNull: ['$dislike', []] },
                                    // likes: { $size: { $ifNull: ['$like', []] } },
                                    // dislikes: { $size: { $ifNull: ['$dislike', []] } },
                                    attachment: 1 // Include attachment in replies
                                }
                            }
                        ],
                        as: 'replies'
                    }
                },
                {
                    $project: {
                        _id: 1,
                        firstName: '$author.firstName',
                        lastName: '$author.lastName',
                        email: '$author.email',
                        userName: '$author.userName',
                        userId: '$author._id',
                        content: 1,
                        profileImage: '$author.profileImage',
                        coverImage: '$author.coverImage',
                        interests: '$author.interests',
                        createdAt: 1,
                        like: { $ifNull: ['$like', []] },
                        dislike: { $ifNull: ['$dislike', []] },
                        // likes: { $size: { $ifNull: ['$like', []] } },
                        // dislikes: { $size: { $ifNull: ['$dislike', []] } },
                        attachment: 1, // Include attachment in parent comments
                        replies: 1
                    }
                },
                {
                    $sort: { createdAt: -1 }
                }
            ]);

            return commentsData;
        } catch (error) {
            console.error(error);
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException("Failed to create comment");
        }
    }

    /**
     * Like a comment.
     *
     * If the user has already liked the comment, unlike it.
     * If the user has disliked the comment, remove the dislike.
     *
     * @param commentId The id of the comment to like
     * @param userId The id of the user to like the comment for
     * @throws `BadRequestException` if the commentId is invalid
     * @throws `NotFoundException` if the comment is not found
     * @throws `BadRequestException` if there is an error liking the comment
     */
    async likeComment(commentId: Types.ObjectId, userId: Types.ObjectId) {
        try {
            if (!commentId) {
                throw new BadRequestException("Invalid commentId");
            }

            const comment = await this.commentModel.findById(commentId).exec();

            if (!comment) {
                throw new NotFoundException("Comment not found");
            }

            const alreadyLiked = comment.like.includes(userId);
            if (alreadyLiked) {
                return await this.commentModel.findByIdAndUpdate(
                    commentId,
                    { $pull: { like: userId } },
                    { new: true }
                );
            } else {
                return await this.commentModel.findByIdAndUpdate(
                    commentId,
                    {
                        $addToSet: { like: userId },
                        $pull: { dislike: userId },
                    },
                    { new: true }
                );
            }

        } catch (error) {
            console.log(error);
            if (error instanceof BadRequestException) {
                throw error;
            }
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException("Failed to like comment");
        }
    }

    /**
     * Dislike a comment.
     *
     * If the user has already disliked the comment, remove the dislike.
     * If the user has liked the comment, remove the like.
     *
     * @param commentId The id of the comment to dislike
     * @param userId The id of the user to dislike the comment for
     * @throws `BadRequestException` if the commentId is invalid
     * @throws `NotFoundException` if the comment is not found
     * @throws `BadRequestException` if there is an error disliking the comment
     */
    async dislikeComment(commentId: Types.ObjectId, userId: Types.ObjectId) {
        try {
            if (!commentId) {
                throw new BadRequestException("Invalid commentId");
            }

            const comment = await this.commentModel.findById(commentId).exec();

            if (!comment) {
                throw new NotFoundException("Comment not found");
            }

            const alreadyDisliked = comment.dislike.includes(userId);
            if (alreadyDisliked) {
                return await this.commentModel.findByIdAndUpdate(
                    commentId,
                    { $pull: { dislike: userId } },
                    { new: true }
                );
            } else {
                return await this.commentModel.findByIdAndUpdate(
                    commentId,
                    {
                        $addToSet: { dislike: userId },
                        $pull: { like: userId },
                    },
                    { new: true }
                );
            }
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException("Failed to dislike comment");
        }
    }

    /**
     * Soft delete a comment by setting the isDeleted field to true.
     *
     * @param commentId The id of the comment to delete
     * @param userId The id of the user to delete the comment for
     * @throws `BadRequestException` if the commentId is invalid
     * @throws `NotFoundException` if the comment is not found
     * @throws `BadRequestException` if there is an error deleting the comment
     */
    async deleteComment(commentId: Types.ObjectId) {
        try {
            if (!commentId) {
                throw new BadRequestException("Invalid commentId");
            }

            const comment = await this.commentModel.findById(commentId).exec();

            if (!comment) {
                throw new NotFoundException("Comment not found");
            }

            const updatedComment = await this.commentModel.findByIdAndUpdate(commentId, { isDeleted: true }, { new: true });

            if (!updatedComment) {
                throw new BadRequestException("Failed to delete comment");
            }

            return updatedComment;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException("Failed to delete comment");
        }
    }
}