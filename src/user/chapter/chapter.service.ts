import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
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

    //----------------CREATE CHAPTER------------------

    /**
     * Creates a new chapter. The chapter is automatically published if the user is an
     * owner, admin, or moderator of the club. Otherwise, the chapter is proposed and
     * requires approval from a privileged user.
     * @param createChapterDto - The request body containing the club id and node id.
     * @param userData - The user data containing the user id and role.
     * @returns A promise that resolves to the created chapter, or an error object if there was an error.
     * @throws `NotFoundException` if the club is not found.
     * @throws `Error` if there was an error while trying to create the chapter.
     */
    async createChapter(createChapterDto: any, userData: any) {
        const session = await this.connection.startSession();
        session.startTransaction();

        try {
            const { userRole, userId } = userData;
            const { club, node } = createChapterDto;

            const existedClub = await this.clubModel.findById(new Types.ObjectId(club)).session(session);

            if (!existedClub) {
                throw new NotFoundException('Club not found');
            }

            const existedChapter = await this.chapterModel.findOne({
                node: new Types.ObjectId(node),
                club: new Types.ObjectId(club)
            }).session(session);

            if (existedChapter) {
                throw new Error('Chapter already exists');
            }

            const isPrivilegedUser = ['owner', 'admin', 'moderator'].includes(userRole);

            const chapterData = new this.chapterModel({
                name: existedClub.name,
                profileImage: existedClub.profileImage,
                coverImage: existedClub.coverImage,
                club: new Types.ObjectId(club),
                node: new Types.ObjectId(node),
                status: isPrivilegedUser ? 'published' : 'proposed',
                proposedBy: new Types.ObjectId(userId),
                publishedBy: isPrivilegedUser ? new Types.ObjectId(userId) : null,
            })

            const chapter = await chapterData.save({ session });

            if (isPrivilegedUser) {
                const chapterMemberData = new this.chapterMemberModel({
                    chapter: chapter._id,
                    user: new Types.ObjectId(userId),
                    role: userRole === 'owner' ? 'admin' : userRole,
                    status: 'MEMBER',
                })

                await chapterMemberData.save({ session });

                await this.clubMembersModel.findOneAndUpdate(
                    {
                        club: new Types.ObjectId(club),
                        user: new Types.ObjectId(userId)
                    },
                    {
                        $setOnInsert: {
                            club: new Types.ObjectId(club),
                            user: new Types.ObjectId(userId),
                            role: 'member',
                            status: 'MEMBER',
                        }
                    },
                    {
                        upsert: true,
                        session,
                        runValidators: true
                    }
                );
            }

            await session.commitTransaction();

            return chapter

        } catch (error) {
            console.log('error creating chapter', error);
            await session.abortTransaction();
            if (error instanceof NotFoundException) {
                throw error;
            }

            throw new Error(`Failed to create chapter: ${error.message}`);
        } finally {
            session.endSession();
        }
    }

    //----------------GET PUBLISHED CHAPTERS OF NODE------------------

    /**
     * Retrieves all published chapters in a given node
     * @param nodeId The ID of the node to retrieve chapters from
     * @returns An array of published chapters in the node
     * @throws {NotFoundException} If the node ID is not provided
     * @throws {Error} If there is an error while retrieving chapters
     */
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

    //----------------GET PUBLIC CLUBS------------------

    /**
     * Retrieves all public clubs in a given node that match a given term (case-insensitive).
     * @param nodeId The ID of the node to retrieve clubs from
     * @param term The search term to filter clubs by
     * @returns An array of public clubs in the node that match the given term
     * @throws {NotFoundException} If the node ID is not provided
     * @throws {Error} If there is an error while retrieving clubs
     */
    async getPublicClubs(nodeId: Types.ObjectId, term: string) {
        try {

            if (!nodeId) {
                throw new NotFoundException('Please provide node id');
            }

            console.log({ nodeId, term })
            let query = { isPublic: true } as { isPublic: boolean; name?: { $regex: string; $options: string } };
            if (term) {
                query = { isPublic: true, name: { $regex: term, $options: 'i' } }
            }

            const clubs = await this.clubModel.aggregate([
                { $match: query },

                {
                    $lookup: {
                        from: 'chapters',
                        let: { clubId: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$club', '$$clubId'] },
                                            { $eq: ['$node', nodeId] }
                                        ]
                                    }
                                }
                            }
                        ],
                        as: 'chapters'
                    }
                },
                {
                    $match: {
                        chapters: { $size: 0 }
                    }
                },
                {
                    $project: {
                        chapters: 0
                    }
                }
            ]);

            return clubs;

        } catch (error) {
            console.log('error getting all clubs of user', error);
            if (error instanceof NotFoundException) throw error;
            throw new Error('Error getting all clubs of user');
        }
    }

    //----------------GET PROPOSED CHAPTERS OF NODE------------------

    /**
     * Retrieves all proposed chapters in a given node
     * @param nodeId The ID of the node to retrieve chapters from
     * @returns An array of proposed chapters in the node
     * @throws {NotFoundException} If the node ID is not provided or if there are no proposed chapters for the given node
     * @throws {Error} If there is an error while retrieving chapters
     */
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

    //----------------PUBLISH OR REJECT CHAPTER------------------

    /**
     * Publishes or rejects a chapter.
     * @param chapterUserData - An object containing the user's role and ID.
     * @param updateChapterStatusDto - An object containing the chapter ID and status to set.
     * @returns A promise that resolves to an object containing a message and status.
     * @throws {NotFoundException} If the chapter is not found.
     * @throws {Error} If there is an error while publishing or rejecting the chapter.
     */
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

            // add members to chapter
            const chapterPublishedMemberData = new this.chapterMemberModel({
                chapter: updateChapterStatusDto.chapterId,
                user: chapterUserData.userId,
                role: chapterUserData.userRole === 'owner' ? 'admin' : chapterUserData.userRole,
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

            // add members to club
            await this.clubMembersModel.findOneAndUpdate(
                {
                    club: new Types.ObjectId(existedChapter.club),
                    user: new Types.ObjectId(chapterUserData.userId)
                },
                {
                    $setOnInsert: {
                        club: new Types.ObjectId(existedChapter.club),
                        user: new Types.ObjectId(chapterUserData.userId),
                        status: 'MEMBER',
                        role: 'member',
                    }
                },
                {
                    upsert: true,
                    session,
                    runValidators: true
                }
            );

            await this.clubMembersModel.findOneAndUpdate(
                {
                    club: new Types.ObjectId(existedChapter.club),
                    user: new Types.ObjectId(existedChapter.proposedBy)
                },
                {
                    $setOnInsert: {
                        club: new Types.ObjectId(existedChapter.club),
                        user: new Types.ObjectId(existedChapter.proposedBy),
                        status: 'MEMBER',
                        role: 'member',
                    }
                },
                {
                    upsert: true,
                    session,
                    runValidators: true
                }
            );

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
