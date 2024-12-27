import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { profile } from 'console';
import { Connection, Model, Types } from 'mongoose';
import { ChapterMember } from 'src/shared/entities/chapters/chapter-member';
import { Chapter } from 'src/shared/entities/chapters/chapter.entity';
import { Club } from 'src/shared/entities/club.entity';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';
import { UpdateChapterStatusDto } from './dto/chapter.dto';

@Injectable()
export class ChapterService {
    constructor(
        @InjectModel(Club.name) private readonly clubModel: Model<Club>,
        @InjectModel(ClubMembers.name) private readonly clubMembersModel: Model<ClubMembers>,
        @InjectModel(Chapter.name) private readonly chapterModel: Model<Chapter>,
        @InjectModel(ChapterMember.name) private readonly chapterMemberModel: Model<ChapterMember>,
        @InjectConnection() private connection: Connection,
    ) { }

    async createChapter(createChapterDto: any, userData: any) {
        const session = await this.connection.startSession();
        session.startTransaction();

        try {
            const { userRole, userId } = userData;
            const { club, node } = createChapterDto;

            const existdedClub = await this.clubModel.findById(new Types.ObjectId(club));

            if (!existdedClub) {
                throw new NotFoundException('Club not found');
            }

            const chapterData = new this.chapterModel({
                name: existdedClub.name,
                club: new Types.ObjectId(club),
                node: new Types.ObjectId(node),
                status: ['owner', 'admin', 'moderator'].includes(userRole) ? 'published' : 'proposed',
                proposedBy: new Types.ObjectId(userId),
                publishedBy: ['owner', 'admin', 'moderator'].includes(userRole) ? new Types.ObjectId(userId) : null,
            })

            const chapter = await chapterData.save({ session });

            if (['owner', 'admin', 'moderator'].includes(userRole)) {
                const chapterMemberData = new this.chapterMemberModel({
                    chapter: chapter._id,
                    user: new Types.ObjectId(userId),
                    role: userRole,
                    status: 'MEMBER',
                })

                await chapterMemberData.save({ session });
            }

            await session.commitTransaction();

            return chapter

        } catch (error) {
            console.log('error creating chapter', error);
            await session.abortTransaction();
            if (error instanceof NotFoundException) {
                throw error;
            }

            throw new Error('Error creating chapter');
        } finally {
            session.endSession();
        }
    }

    async getPublishedChaptersOfNode(nodeId: Types.ObjectId) {
        try {
            if (!nodeId) {
                throw new NotFoundException('Please provide node id');
            }

            const chapters = await this.chapterModel.find({
                node: nodeId,
                status: 'published'
            })

            return chapters;

        } catch (error) {
            console.log('error getting all published chapters of user', error);
            if (error instanceof NotFoundException) throw error;
            throw new Error('Error getting all published chapters of user');
        }
    }

    async getPublicClubsOfUser(userId: Types.ObjectId, nodeId: Types.ObjectId) {
        try {

            if (!nodeId) {
                throw new NotFoundException('Please provide node id');
            }

            const userClubs = await this.clubMembersModel.aggregate([
                {
                    $match: { user: userId }
                },
                {
                    $lookup: {
                        from: 'clubs',
                        localField: 'club',
                        foreignField: '_id',
                        as: 'clubDetails'
                    }
                },
                {
                    $match: {
                        'clubDetails.isPublic': true
                    }
                },
                {
                    $lookup: {
                        from: 'chapters',
                        localField: nodeId.toString(),
                        foreignField: 'node',
                        as: 'userChapters'
                    }
                },
                {
                    $match: { club: { $ne: '$userChapters.club' } }

                },
                {
                    $project: {
                        _id: { $arrayElemAt: ["$clubDetails._id", 0] },
                        profileImage: { $arrayElemAt: ["$clubDetails.profileImage", 0] },
                        name: { $arrayElemAt: ["$clubDetails.name", 0] },
                    }
                }
            ])

            return userClubs

        } catch (error) {
            console.log('error getting all clubs of user', error);
            if (error instanceof NotFoundException) throw error;
            throw new Error('Error getting all clubs of user');
        }
    }

    async getProposedChaptersOfNode(nodeId: Types.ObjectId) {
        try {

            if (!nodeId) {
                throw new NotFoundException('Please provide node id');
            }

            const nodeProposedChapters = await this.chapterModel.find({
                node: nodeId,
                status: 'proposed'
            })

            return nodeProposedChapters;

        } catch (error) {
            console.log('error getting proposed chapters of node', error);
            if (error instanceof NotFoundException) throw new NotFoundException('No proposed chapters found for the given node');
            throw new Error('Error getting proposed chapters of node');
        }
    }

    async publishOrRejectChapter(
        chapterUserData: {
            userRole: string,
            userId: Types.ObjectId,
        },
        updateChapterStatusDto: UpdateChapterStatusDto
    ) {
        const session = await this.connection.startSession();
        session.startTransaction()
        try {

            if (updateChapterStatusDto.status === 'reject') {
                await this.chapterModel.findByIdAndDelete(updateChapterStatusDto.chapterId, { session });
                return {
                    message: 'Chapter rejected',
                    status: true
                }
            }

            const existedChapter = await this.chapterModel.findByIdAndUpdate(
                updateChapterStatusDto.chapterId,
                {
                    status: 'published',
                    publishedBy: chapterUserData.userId
                },
                { session, new: true }
            );

            if (!existedChapter) {
                throw new NotFoundException('Chapter not found');
            }

            const chapterPublishedMemberData = new this.chapterMemberModel({
                chapter: updateChapterStatusDto.chapterId,
                user: chapterUserData.userId,
                role: chapterUserData.userRole,
                status: 'MEMBER',
            })

            await chapterPublishedMemberData.save({ session });

            const chapterProposedMemberData = new this.chapterMemberModel({
                chapter: updateChapterStatusDto.chapterId,
                user: existedChapter.proposedBy,
                role: 'member',
                status: 'MEMBER',
            })

            await chapterProposedMemberData.save({ session });

            await session.commitTransaction();

            return {
                message: 'Chapter published',
                status: true
            }

        } catch (error) {
            console.log('error publishing/rejecting chapter', error);
            await session.abortTransaction();
            if (error instanceof NotFoundException) throw error;
            throw new Error('Error publishing/rejecting chapter');
        } finally {
            session.endSession();
        }
    }
}
