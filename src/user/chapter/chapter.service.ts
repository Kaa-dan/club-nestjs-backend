import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { ChapterMember } from 'src/shared/entities/chapters/chapter-member';
import { Chapter } from 'src/shared/entities/chapters/chapter.entity';
import { Club } from 'src/shared/entities/club.entity';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';
import { DeleteChapterDto, JoinUserChapterDto, LeaveUserChapterDto, RemoveUserChapterDto, UpdateChapterStatusDto } from './dto/chapter.dto';
import { NodeMembers } from 'src/shared/entities/node-members.entity';
import { async } from 'rxjs';
import { Node_ } from 'src/shared/entities/node.entity';
import { Project } from 'src/shared/entities/projects/project.entity';
import { ChapterProject } from 'src/shared/entities/chapters/modules/chapter-projects';

@Injectable()
export class ChapterService {
    constructor(
        @InjectModel(Club.name) private readonly clubModel: Model<Club>,
        @InjectModel(Node_.name) private readonly nodeModel: Model<Node_>,
        @InjectModel(ClubMembers.name) private readonly clubMembersModel: Model<ClubMembers>,
        @InjectModel(Chapter.name) private readonly chapterModel: Model<Chapter>,
        @InjectModel(ChapterMember.name) private readonly chapterMemberModel: Model<ChapterMember>,
        @InjectModel(NodeMembers.name) private readonly nodeMembersModel: Model<NodeMembers>,
        @InjectModel(Project.name) private readonly ProjectModel: Model<Project>,
        @InjectModel(ChapterProject.name) private readonly ChapterProjectModel: Model<ChapterProject>,
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

            const existedNode = await this.nodeModel.findById(new Types.ObjectId(node)).session(session);

            if (!existedNode) {
                throw new NotFoundException('Node not found');
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
                name: `${existedClub.name} - ${existedNode.name}`,
                about: existedClub.about,
                description: existedClub.description,
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
                const validRoles = ['admin', 'moderator', 'member'];
                const assignedRole = userRole === 'owner' ? 'admin' : userRole;

                if (!validRoles.includes(assignedRole)) {
                    throw new Error('Invalid user role');
                }

                const chapterMemberData = new this.chapterMemberModel({
                    chapter: chapter._id,
                    user: new Types.ObjectId(userId),
                    role: assignedRole,
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

            // Copy Assets from Club to Chapter
            // Project Assets

            const clubProjects = await this.ProjectModel.find({ club: new Types.ObjectId(club), status: 'published' }).session(session);

            if (clubProjects.length > 0) {
                const chapterProjectsToInsert = clubProjects.map(project => ({
                    chapter: chapter._id,
                    project: project._id,
                    status: 'published'
                }));

                await this.ChapterProjectModel.insertMany(chapterProjectsToInsert, { session });
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

            const chapters = await this.chapterModel.aggregate([
                {
                    $match: {
                        node: nodeId,
                        status: 'published',
                        isDeleted: false,
                    }
                },
                {
                    $lookup: {
                        from: 'chaptermembers',
                        let: { chapterId: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$chapter', '$$chapterId'] },
                                            { $eq: ['$status', 'MEMBER'] },
                                        ]
                                    }
                                }
                            }
                        ],
                        as: 'members'
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'members.user',
                        foreignField: '_id',
                        as: 'members'
                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        profileImage: 1,
                        coverImage: 1,
                        club: 1,
                        node: 1,
                        status: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        "members._id": 1,
                        "members.userName": 1,
                        "members.email": 1,
                        "members.profileImage": 1,
                        "members.coverImage": 1,
                        "members.dateOfBirth": 1,
                        "members.firstName": 1,
                        "members.lastName": 1,
                        "members.gender": 1
                    }
                }

            ])

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

            const nodeProposedChapters = await this.chapterModel
                .find({
                    node: new Types.ObjectId(nodeId),
                    status: 'proposed',
                    isDeleted: false,
                })
                .populate({
                    path: 'proposedBy',
                    select: '-password -isBlocked -emailVerified -registered -signupThrough -isOnBoarded -onBoardingStage -__v'
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
                await this.chapterModel.findByIdAndUpdate(
                    updateChapterStatusDto.chapterId,
                    {
                        status: 'rejected',
                        rejectedBy: new Types.ObjectId(chapterUserData.userId),
                        rejectedReason: updateChapterStatusDto.rejectedReason
                    },
                    { session, new: true }
                )

                await session.commitTransaction();

                return {
                    message: 'Chapter rejected successfully',
                    status: 'success'
                }
            }

            const existedChapter = await this.chapterModel.findByIdAndUpdate(
                updateChapterStatusDto.chapterId,
                {
                    status: 'published',
                    publishedBy: new Types.ObjectId(chapterUserData.userId)
                },
                { session, new: true }
            );

            if (!existedChapter) {
                throw new NotFoundException('Chapter not found');
            }

            // add members to chapter
            const validRoles = ['admin', 'moderator', 'member'];
            const assignedRole = chapterUserData.userRole === 'owner' ? 'admin' : chapterUserData.userRole;

            if (!validRoles.includes(assignedRole)) {
                throw new Error('Invalid user role');
            }

            const chapterPublishedMemberData = new this.chapterMemberModel({
                chapter: new Types.ObjectId(updateChapterStatusDto.chapterId),
                user: new Types.ObjectId(chapterUserData.userId),
                role: assignedRole,
                status: 'MEMBER',
            })

            await chapterPublishedMemberData.save({ session });

            const chapterProposedMemberData = new this.chapterMemberModel({
                chapter: new Types.ObjectId(updateChapterStatusDto.chapterId),
                user: new Types.ObjectId(existedChapter.proposedBy),
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

    //----------------JOIN CHAPTER------------------

    /**
     * Join a chapter. If the user is an owner, admin, or moderator of the club,
     * they are automatically assigned the same role in the chapter. Otherwise,
     * they are assigned the member role.
     * @param userData - The user data containing the user id and role.
     * @param joinUserChapterDto - The request body containing the chapter id.
     * @returns A promise that resolves to an object with a message and status,
     * or an error object if there was an error.
     * @throws `NotFoundException` if the chapter is not found.
     * @throws `ConflictException` if the user is already a member of the chapter.
     * @throws `Error` if there was an error while trying to join the chapter.
         */
    async joinChapter(userData: any, joinUserChapterDto: JoinUserChapterDto) {
        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            const chapter = await this.chapterModel.findOne({
                _id: new Types.ObjectId(joinUserChapterDto.chapter),
                status: 'published'
            }).session(session);

            if (!chapter) {
                throw new NotFoundException('Chapter not found');
            }

            const existedMember = await this.chapterMemberModel.findOne({
                chapter: new Types.ObjectId(joinUserChapterDto.chapter),
                user: new Types.ObjectId(userData.userId)
            }).session(session);

            if (existedMember) {
                throw new ConflictException('You are already a member of this chapter');
            }

            const validRoles = ['admin', 'moderator', 'member'];
            const assignedRole = userData.userRole === 'owner' ? 'admin' : userData.userRole;

            if (!validRoles.includes(assignedRole)) {
                throw new Error('Invalid user role');
            }

            const chapterMemberData = new this.chapterMemberModel({
                chapter: new Types.ObjectId(joinUserChapterDto.chapter),
                user: new Types.ObjectId(userData.userId),
                role: assignedRole,
                status: 'MEMBER',
            })

            await chapterMemberData.save({ session });
            await session.commitTransaction();

            return {
                message: 'user joined chapter',
                status: true
            }

        } catch (error) {
            await session.abortTransaction();
            console.log('error joining chapter', error);
            if (error instanceof NotFoundException) throw error;
            if (error instanceof ConflictException) throw error;
            throw new Error('Error joining chapter');
        } finally {
            session.endSession();
        }
    }

    //----------------REMOVE USER FROM CHAPTER------------------

    /**
     * Remove a user from a chapter.
     * @param userId - The id of the user removing the user from the chapter.
     * @param removeUserChapterDto - The request body containing the chapter id and the user id of the user to remove from the chapter.
     * @returns A promise that resolves to an object with a message and status,
     * or an error object if there was an error.
     * @throws `NotFoundException` if the chapter is not found or if the user is not found.
     * @throws `ForbiddenException` if the user is a member of the chapter, or if the user is trying to remove a user with a higher role or with the same role.
     * @throws `Error` if there was an error while trying to remove the user from the chapter.
     */
    async removeUserFromChapter(userId: Types.ObjectId, removeUserChapterDto: RemoveUserChapterDto) {
        try {
            // check if user who is removing the user exists
            const userExists = await this.chapterMemberModel.findOne({
                chapter: new Types.ObjectId(removeUserChapterDto.chapter),
                user: new Types.ObjectId(userId),
            });

            if (!userExists) {
                throw new NotFoundException('you are not the member of this chapter');
            }

            // check if user to remove exists
            const userToRemoveExists = await this.chapterMemberModel.findOne({
                chapter: new Types.ObjectId(removeUserChapterDto.chapter),
                user: new Types.ObjectId(removeUserChapterDto.userToRemove)
            });

            if (!userToRemoveExists) {
                throw new NotFoundException('User to remove not the member of this chapter');
            }

            if (userExists.role === 'member') {
                throw new ForbiddenException('User can not remove an user with member role');
            }

            if ((userExists.role === 'admin' && userToRemoveExists.role === 'admin') ||
                (userExists.role === 'moderator' && userToRemoveExists.role === 'moderator') ||
                (userExists.role === 'moderator' && userToRemoveExists.role === 'admin')
            ) {
                throw new ForbiddenException('User can not remove an user with higher role or with same role');
            }


            await this.chapterMemberModel.deleteOne({
                chapter: removeUserChapterDto.chapter,
                user: removeUserChapterDto.userToRemove
            });

            return {
                message: 'User removed from chapter',
                status: true
            }

        } catch (error) {
            console.log('error removing user from chapter', error);
            if (error instanceof NotFoundException) throw error;
            throw new Error('Error removing user from chapter');
        }
    }

    //----------------DELETE CHAPTER------------------

    /**
     * Deletes a chapter.
     * @param deleteChapterDto The request body containing the chapter id.
     * @returns A promise that resolves to an object containing a message and status.
     * @throws {NotFoundException} If the chapter is not found.
     * @throws {ConflictException} If the chapter is already deleted.
     * @throws {Error} If there is an error while deleting the chapter.
     */
    async deleteChapter(deleteChapterDto: DeleteChapterDto) {
        try {
            const chapter = await this.chapterModel.findById(deleteChapterDto.chapter);

            if (!chapter) {
                throw new NotFoundException('Chapter not found');
            }

            if (chapter.isDeleted) {
                throw new ConflictException('Chapter is not found');
            }

            await this.chapterModel.findByIdAndUpdate(
                new Types.ObjectId(deleteChapterDto.chapter),
                { isDeleted: true },
                { new: true }
            );

            return {
                message: 'Chapter deleted',
                status: true
            };

        } catch (error) {
            console.error('Error deleting chapter:', error);
            if (error instanceof NotFoundException || error instanceof ConflictException) {
                throw error;
            }

            throw new Error('Error deleting chapter');
        }
    }

    //----------------GET CHAPTER------------------
    /**
     * Retrieves a chapter by id.
     * @param chapterId The id of the chapter to retrieve.
     * @returns A promise that resolves to the chapter, or an error object if there was an error.
     * @throws {NotFoundException} If the chapter is not found.
     * @throws {Error} If there was an error while retrieving the chapter.
     */
    async getChapter(chapterId: Types.ObjectId) {
        if (!chapterId) {
            throw new NotFoundException('Chapter id is required');
        }

        try {
            const chapter = await this.chapterModel.findById(chapterId).populate([
                { path: 'node', select: 'name about profileImage coverImage' },
                { path: 'club', select: 'name about profileImage coverImage' },
            ]);

            if (!chapter) {
                throw new NotFoundException('Chapter not found');
            }

            const chapterMembers = await this.chapterMemberModel.find({
                chapter: new Types.ObjectId(chapterId),
            })
                .populate('user', 'userName email firstName lastName dateOfBirth gender profileImage coverImage interests');

            return { chapter, chapterMembers };

        } catch (error) {
            console.error('Error getting chapter:', error);

            if (error instanceof NotFoundException) {
                throw error;
            }

            throw new Error('Error getting chapter');
        }
    }

    /**
     * Removes a user from a chapter.
     * @param chapterUserData - An object containing the user's role and ID.
     * @param leaveUserChapterDto - An object containing the chapter id.
     * @returns A promise that resolves to an object containing a message and status.
     * @throws {Error} If there was an error while removing the user from the chapter.
     */
    async leaveUserFromChapter(chapterUserData: any, leaveUserChapterDto: LeaveUserChapterDto) {
        try {

            console.log({ chapterUserData, leaveUserChapterDto });

            const chapterAdmins = await this.chapterMemberModel.find({
                chapter: new Types.ObjectId(leaveUserChapterDto.chapter),
                role: 'admin',
                user: { $ne: chapterUserData.userId }
            })

            if (chapterUserData.userRole !== 'admin' || chapterAdmins.length > 1) {

                await this.chapterMemberModel.findOneAndDelete({
                    chapter: new Types.ObjectId(leaveUserChapterDto.chapter),
                    user: new Types.ObjectId(chapterUserData.userId)
                })

                return {
                    message: 'User left from chapter',
                    status: true
                }
            }

            let newChapterAdmin;

            newChapterAdmin = await this.chapterMemberModel
                .findOne({
                    role: 'moderator',
                })
                .sort({ createdAt: 1 })
                .exec();

            if (!newChapterAdmin) {
                newChapterAdmin = await this.chapterMemberModel
                    .findOne({
                        role: 'member',
                    })
                    .sort({ createdAt: 1 })
                    .exec();
            }

            if (!newChapterAdmin) {
                throw new Error("you can't leave the chapter");
            }

            newChapterAdmin.role = 'admin';
            await newChapterAdmin.save();

            return {
                message: 'User left from chapter',
                status: true
            }

        } catch (error) {
            console.log('error leaving user from chapter', error);
            throw new Error('Error leaving user from chapter');
        }
    }

    /**
     * Retrieves the status of a user in a chapter.
     * @param userId The id of the user.
     * @param chapterId The id of the chapter.
     * @returns A promise that resolves to an object with the user's status and role in the chapter.
     * The status can be 'VISITOR', 'MEMBER', 'BLOCKED', or 'PENDING'.
     * The role can be null, 'owner', 'admin', 'moderator', or 'member'.
     * @throws {Error} If there was an error while retrieving the user's status.
     */
    async getChapterMemberStatus(userId: string, chapterId: string) {
        try {
            let status = 'VISITOR';

            const isMember = await this.chapterMemberModel.findOne({
                chapter: new Types.ObjectId(chapterId),
                user: new Types.ObjectId(userId)
            });

            if (isMember) {
                status = isMember.status;
                return { status, role: isMember.role };
            }

            return { status, role: null };
        } catch (error) {
            console.log('error getting chapter member status', error);
            throw new Error('Error getting chapter member status');
        }
    }

    /**
     * Upvotes a proposed chapter. If the user has already upvoted the chapter, 
     * their upvote is removed. If the user has downvoted the chapter, the downvote 
     * is also removed upon upvoting.
     * 
     * @param chapterId - The ID of the chapter to upvote.
     * @param userId - The ID of the user performing the upvote.
     * @returns A promise that resolves to the updated chapter document.
     * @throws {NotFoundException} If the chapter ID is not provided or if no proposed chapter is found.
     * @throws {Error} If there is an error while upvoting the chapter.
     */
    async upvoteProposedChapter(chapterId: string, userId: string) {
        try {
            if (!chapterId) {
                throw new NotFoundException('Chapter id is required');
            }

            const existedChapter = await this.chapterModel.findOne({
                _id: new Types.ObjectId(chapterId),
                status: 'proposed'
            });

            if (!existedChapter) {
                throw new NotFoundException('No proposed chapter found');
            }

            const alreadyUpvote = existedChapter.upvotes.some((upvote) =>
                upvote.user.equals(new Types.ObjectId(userId))
            )

            if (alreadyUpvote) {
                return await this.chapterModel.findByIdAndUpdate(
                    new Types.ObjectId(chapterId),
                    { $pull: { upvotes: { user: new Types.ObjectId(userId) } } },
                    { new: true }
                )
            }

            return await this.chapterModel.findByIdAndUpdate(
                new Types.ObjectId(chapterId),
                {
                    $addToSet: { upvotes: { user: new Types.ObjectId(userId), date: new Date() } },
                    $pull: { downvotes: { user: new Types.ObjectId(userId) } }
                },
                { new: true }
            );

        } catch (error) {
            console.log('error upvoting chapter', error);
            if (error instanceof NotFoundException) throw error
            throw new Error('Error upvoting chapter');
        }
    }

    /**
     * Downvotes a proposed chapter. If the user has already downvoted the chapter,
     * their downvote is removed. If the user has upvoted the chapter, the upvote
     * is also removed upon downvoting.
     *
     * @param chapterId - The ID of the chapter to downvote.
     * @param userId - The ID of the user performing the downvote.
     * @returns A promise that resolves to the updated chapter document.
     * @throws {NotFoundException} If the chapter ID is not provided or if no proposed chapter is found.
     * @throws {Error} If there is an error while downvoting the chapter.
     */
    async downvoteProposedChapter(chapterId: string, userId: string) {
        try {

            if (!chapterId) {
                throw new NotFoundException('Chapter id is required');
            }

            const existedChapter = await this.chapterModel.findOne({
                _id: new Types.ObjectId(chapterId),
                status: 'proposed'
            });

            if (!existedChapter) {
                throw new NotFoundException('No proposed chapter found');
            }

            const alreadyDownvote = existedChapter.downvotes.some((downvote) =>
                downvote.user.equals(new Types.ObjectId(userId))
            )

            if (alreadyDownvote) {
                return await this.chapterModel.findByIdAndUpdate(
                    new Types.ObjectId(chapterId),
                    { $pull: { downvotes: { user: new Types.ObjectId(userId) } } },
                    { new: true }
                )
            }

            return await this.chapterModel.findByIdAndUpdate(
                new Types.ObjectId(chapterId),
                {
                    $addToSet: { downvotes: { user: new Types.ObjectId(userId), date: new Date() } },
                    $pull: { upvotes: { user: new Types.ObjectId(userId) } }
                },
                { new: true }
            )

        } catch (error) {
            console.log('error downvoting chapter', error);
            if (error instanceof NotFoundException) throw error
            throw new Error('Error downvoting chapter');
        }
    }

    async getRejectedChaptersOfNode(nodeId: Types.ObjectId) {
        try {

            if (!nodeId) {
                throw new NotFoundException('Node id is required');
            }

            const nodeRejectedChapters = await this.chapterModel
                .find({
                    node: nodeId,
                    status: 'rejected',
                    isDeleted: false,
                })
                .populate({
                    path: 'rejectedBy',
                    select: '-password -isBlocked -emailVerified -registered -signupThrough -isOnBoarded -onBoardingStage -__v'
                })

            return nodeRejectedChapters;

        } catch (error) {
            console.log('error getting rejected chapters of node', error);
            if (error instanceof NotFoundException) throw error
            throw new Error('Error getting rejected chapters of node');
        }
    }
}
