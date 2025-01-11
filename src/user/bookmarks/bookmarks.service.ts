import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Bookmarks } from 'src/shared/entities/bookmarks.entity';
import { Issues } from 'src/shared/entities/issues/issues.entity';
import { Project } from 'src/shared/entities/projects/project.entity';
import { RulesRegulations } from 'src/shared/entities/rules-regulations.entity';

@Injectable()
export class BookmarksService {

    constructor(@InjectModel(Bookmarks.name) private readonly bookmarksModel) { }
    async createFolder(createFolderDto: any) {
        try {

            const createFolder = await this.bookmarksModel.create({
                title: createFolderDto.title,
                user: createFolderDto.user,
                posts: []
            })

            return {
                status: 'success',
                message: 'Folder created successfully',
                data: createFolder
            }

        } catch (error) {
            console.log({ error })
            throw error;
        }
    }

    async fetchFolders(userId: string) {
        try {

            if (!userId) {
                throw new BadRequestException('user Id is required')
            }
            return await this.bookmarksModel.find({
                user: new Types.ObjectId(userId)
            })

        } catch (error) {
            console.log({ error })
        }
    }
    async addToBookmark(
        folderId: string,
        userId: string,
        entityId: string,
        entityType: string
    ) {
        console.log({ entityType })
        // Validate entityType is one of the allowed types
        // const validEntityTypes = [RulesRegulations.name, Issues.name, Project.name];
        // if (!validEntityTypes.includes(entityType)) {
        //     throw new BadRequestException('Invalid entity type');
        // }

        try {
            // Convert string IDs to ObjectId
            const bookmarkObjectId = new Types.ObjectId(folderId);
            const userObjectId = new Types.ObjectId(userId);
            const entityObjectId = new Types.ObjectId(entityId);

            // Find the bookmark and verify ownership
            const bookmark = await this.bookmarksModel.findOne({
                _id: new Types.ObjectId(bookmarkObjectId),
                user: new Types.ObjectId(userObjectId),
            });
            if (!bookmark) {
                throw new NotFoundException('Bookmark folder not found or unauthorized');
            }

            // Check if the entity already exists in the bookmark
            const existingPost = bookmark.posts.find(
                post =>
                    post.entity.entityId.toString() === entityId &&
                    post.entity.entityType === entityType
            );

            if (existingPost) {
                throw new BadRequestException('Entity already bookmarked in this folder');
            }

            // Add the new post to the bookmark
            const updatedBookmark = await this.bookmarksModel.findByIdAndUpdate(
                bookmarkObjectId,
                {
                    $push: {
                        posts: {
                            createdAt: new Date(),
                            entity: {
                                entityId: entityObjectId,
                                entityType: entityType,
                            },
                        },
                    },
                },
                { new: true }
            );
            console.log({ updatedBookmark })
            return {
                message: `Successfully added to ${bookmark.title}`,
                bookmark: updatedBookmark
            };

        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            if (error.name === 'BSONError' || error.name === 'CastError') {
                throw new BadRequestException('Invalid ID format');
            }
            throw new InternalServerErrorException('Error adding to bookmark');
        }
    }
}
