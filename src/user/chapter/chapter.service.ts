import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { profile } from 'console';
import { Connection, Model, Types } from 'mongoose';
import { ChapterMember } from 'src/shared/entities/chapters/chapter-member';
import { Chapter } from 'src/shared/entities/chapters/chapter.entity';
import { Club } from 'src/shared/entities/club.entity';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';

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

    async getPublicClubsOfUser(userId: Types.ObjectId, nodeId: Types.ObjectId) {
        try {

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
            throw new Error('Error getting all clubs of user');
        }
    }
}
