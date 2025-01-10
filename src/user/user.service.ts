import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';

import { UserResponseDto } from './dto/user.dto';
import { plainToClass } from 'class-transformer';
import { User } from 'src/shared/entities/user.entity';
import { UserWithoutPassword } from './dto/user.type';
import { AccessDto } from './dto/access.dto';
import { NodeMembers } from 'src/shared/entities/node-members.entity';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';
import { NodeJoinRequest } from 'src/shared/entities/node-join-requests.entity';
import { ClubJoinRequests } from 'src/shared/entities/club-join-requests.entity';
import { ChapterMember } from 'src/shared/entities/chapters/chapter-member.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(NodeMembers.name)
    private readonly nodeMembersModel: Model<NodeMembers>,
    @InjectModel(ClubMembers.name)
    private readonly clubMembersModel: Model<ClubMembers>,
    @InjectModel(ChapterMember.name)
    private readonly chapterMemberModel: Model<ChapterMember>,
    @InjectModel(NodeJoinRequest.name)
    private readonly nodeJoinRequestModel: Model<NodeJoinRequest>,
    @InjectModel(ClubJoinRequests.name)
    private readonly clubJoinRequestsModel: Model<ClubJoinRequests>,
  ) { }

  async getUsersNotInClubOrNode(
    search: string,
    type: 'node' | 'club',
    id: Types.ObjectId,
  ): Promise<UserWithoutPassword[]> {
    try {
      const searchRegex = new RegExp(search, 'i'); // Case-insensitive search

      const aggregationPipeline: any[] = [
        // Stage 1: Initial match for search criteria
        {
          $match: {
            $or: [
              { userName: searchRegex },
              { firstName: searchRegex },
              { lastName: searchRegex },
              { email: searchRegex },
            ],
          },
        },
        // Stage 2: Look up membership based on type
        {
          $lookup: {
            from: type === 'node' ? 'nodemembers' : 'clubmembers',
            let: { userId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: [
                          type === 'node' ? '$node' : '$club',
                          new mongoose.Types.ObjectId(id),
                        ],
                      },
                      { $eq: ['$user', '$$userId'] },
                    ],
                  },
                },
              },
            ],
            as: 'membership',
          },
        },
        // Stage 3: Look up invitations based on type
        {
          $lookup: {
            from: 'invitations',
            let: { userId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: [
                          type === 'node' ? '$node' : '$club',
                          new mongoose.Types.ObjectId(id),
                        ],
                      },
                      { $eq: ['$user', '$$userId'] },
                      // { $eq: ['$isUsed', false] },
                      // { $eq: ['$isRevoked', false] },
                      { $gt: ['$expiresAt', new Date()] }, // Check if invitation is not expired
                    ],
                  },
                },
              },
            ],
            as: 'invitations',
          },
        },
        // Stage 4: Filter out users already in the node/club and with active invitations
        {
          $match: {
            membership: { $eq: [] },
            invitations: { $eq: [] },
          },
        },
        // Stage 5: Project to remove sensitive information
        {
          $project: {
            password: 0,
            membership: 0,
            invitations: 0,
          },
        },
      ];

      return await this.userModel.aggregate(aggregationPipeline);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new InternalServerErrorException('Error fetching users');
    }
  }

  /**
   * Find user by ID
   * @param userId - MongoDB ObjectId of the user
   * @returns User data without password
   * @throws NotFoundException when user is not found
   * @throws InternalServerErrorException on database errors
   */
  async findUserById(userId: Types.ObjectId): Promise<UserResponseDto> {
    try {
      const user = await this.userModel
        .findById(userId)
        .select('-password')
        .lean()
        .exec();

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Transform mongoose document to DTO
      const userResponse = plainToClass(UserResponseDto, {
        _id: user._id.toString(),
        email: user.email,
        interests: user.interests || [],
        isBlocked: user.isBlocked || false,
        emailVerified: user.emailVerified || false,
        registered: user.registered || false,
        signupThrough: user.signupThrough,
        isOnBoarded: user.isOnBoarded || false,
        onBoardingStage: user.onBoardingStage,
        firstName: user.firstName,
        lastName: user.lastName,
        gender: user.gender,
        phoneNumber: user.phoneNumber,
        coverImage: user.coverImage,
        profileImage: user.profileImage,
      });

      return userResponse;
    } catch (error) {
      (error);
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException('Error fetching user profile');
    }
  }

  /**
   * Fetches a user by their username. If the user is not found, a success: false
   * response is returned with a message indicating that the user was not found.
   * If an error occurs, an InternalServerErrorException is thrown.
   *
   * @param term - The username of the user to search for.
   * @returns A Promise that resolves to a ServiceResponse containing the user
   *          details if found, or a success: false response if the user is not
   *          found.
   */
  async getUserByUserName(term: string) {
    if (!term) {
      throw new BadRequestException('Term not found');
    }
    try {
      const user = await this.userModel.findOne(
        { userName: term },
        { password: 0 },
      );
      if (!user) {
        return {
          data: null,
          message: 'User not found.',
          success: false,
        };
      }

      return {
        data: user,
        message: 'user found successfully',
        success: true,
      };
    } catch (error) {
      (error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error fetching user profile');
    }
  }

  async getUsersByNameCriteria(term: string) {
    if (!term) {
      throw new BadRequestException('Term not found');
    }
    try {
      const caseInsensitive = { $regex: term, $options: 'i' };
      const users = await this.userModel
        .find(
          {
            $or: [
              { userName: caseInsensitive },
              { firstName: caseInsensitive },
              { lastName: caseInsensitive },
            ],
          },
          { password: 0 },
        )
        .lean()
        .exec();

      if (!users || users.length === 0) {
        return [];
      }

      const userNameUsers = [];
      const otherUsers = [];

      for (const user of users) {
        if (
          user.userName &&
          user.userName.toLowerCase().includes(term.toLowerCase())
        ) {
          userNameUsers.push(user);
        } else {
          otherUsers.push(user);
        }
      }

      return [...userNameUsers, ...otherUsers];
    } catch (error) {
      console.error('Error fetching users by name criteria:', error);
      throw new InternalServerErrorException('Error fetching user profile');
    }
  }

  async isUserLoggedIn(userId: Types.ObjectId) {
    try {
      const user = await this.userModel.findById(userId).select('-password');
      if (!user) {
        return {
          isLogged: false,
        };
      }
      return { isLogged: true, user };
    } catch (error) { }
  }

  /**
   * Assigns admin role to a user in a specified entity (node or club).
   *
   * @param accessDto - Data transfer object containing entity details and user ID:
   *   - entity: The type of entity ('node' or 'club').
   *   - entityId: The ID of the entity where the role is to be assigned.
   *   - accessToUserId: The ID of the user to be granted the admin role.
   *
   * @returns The updated node or club member document with the new admin role.
   *
   * @throws NotFoundException - If the node or club member, or the user is not found.
   * @throws InternalServerErrorException - If an error occurs while updating admin access.
   */
  async makeAdmin(accessDto: AccessDto) {
    try {
      const { entity, entityId, accessToUserId } = accessDto;

      if (entity === 'node') {

        const nodeMember = await this.nodeMembersModel.findOne({
          node: new Types.ObjectId(entityId),
          user: new Types.ObjectId(accessToUserId),
        });
        if (!nodeMember) {
          throw new NotFoundException('Node Member not found');
        }

        const user = await this.userModel.findById(
          new Types.ObjectId(accessToUserId),
        );
        if (!user) {
          throw new NotFoundException('User not found');
        }

        return await this.nodeMembersModel.findOneAndUpdate(
          { node: nodeMember.node, user: user._id },
          { $set: { role: 'admin' } },
          { new: true },
        );

      } else if (entity === 'club') {

        const clubMember = await this.clubMembersModel.findOne({
          club: new Types.ObjectId(entityId),
          user: new Types.ObjectId(accessToUserId),
        });
        if (!clubMember) {
          throw new NotFoundException('Club Member not found');
        }

        const user = await this.userModel.findById(
          new Types.ObjectId(accessToUserId),
        );
        if (!user) {
          throw new NotFoundException('User not found');
        }

        return await this.clubMembersModel.findOneAndUpdate(
          { club: clubMember.club, user: user._id },
          { $set: { role: 'admin' } },
          { new: true },
        );

      } else if (entity === 'chapter') {

        const chapterMember = await this.chapterMemberModel.findOne({
          chapter: new Types.ObjectId(entityId),
          user: new Types.ObjectId(accessToUserId),
        });

        if (!chapterMember) {
          throw new NotFoundException('Chapter Member not found');
        }

        const user = await this.userModel.findById(
          new Types.ObjectId(accessToUserId),
        );
        if (!user) {
          throw new NotFoundException('User not found');
        }
        return await this.chapterMemberModel.findOneAndUpdate(
          { chapter: chapterMember.chapter, user: user._id },
          { $set: { role: 'admin' } },
          { new: true },
        );

      }

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error updating admin access');
    }
  }

  /**
   * Assigns moderator role to a user in a specified entity (node or club).
   *
   * @param accessDto - Data transfer object containing entity details and user ID:
   *   - entity: The type of entity ('node' or 'club').
   *   - entityId: The ID of the entity where the role is to be assigned.
   *   - accessToUserId: The ID of the user to be granted the moderator role.
   *
   * @returns The updated node or club member document with the new moderator role.
   *
   * @throws NotFoundException - If the node or club member, or the user is not found.
   * @throws InternalServerErrorException - If an error occurs while updating moderator access.
   */
  async makeModerator(accessDto: AccessDto) {
    try {
      const { entity, entityId, accessToUserId } = accessDto;

      if (entity === 'node') {

        const nodeMember = await this.nodeMembersModel.findOne({
          node: new Types.ObjectId(entityId),
          user: new Types.ObjectId(accessToUserId),
        });
        if (!nodeMember) {
          throw new NotFoundException('Node Member not found');
        }

        const user = await this.userModel.findById(
          new Types.ObjectId(accessToUserId),
        );
        if (!user) {
          throw new NotFoundException('User not found');
        }

        return await this.nodeMembersModel.findOneAndUpdate(
          { node: nodeMember.node, user: user._id },
          { $set: { role: 'moderator' } },
          { new: true },
        );

      } else if (entity === 'club') {

        const clubMember = await this.clubMembersModel.findOne({
          club: new Types.ObjectId(entityId),
          user: new Types.ObjectId(accessToUserId),
        });
        if (!clubMember) {
          throw new NotFoundException('Club Member not found');
        }

        const user = await this.userModel.findById(
          new Types.ObjectId(accessToUserId),
        );
        if (!user) {
          throw new NotFoundException('User not found');
        }

        return await this.clubMembersModel.findOneAndUpdate(
          { club: clubMember.club, user: user._id },
          { $set: { role: 'moderator' } },
          { new: true },
        );

      } else if (entity === 'chapter') {

        const chapterMember = await this.chapterMemberModel.findOne({
          chapter: new Types.ObjectId(entityId),
          user: new Types.ObjectId(accessToUserId),
        });

        if (!chapterMember) {
          throw new NotFoundException('Chapter Member not found');
        }

        const user = await this.userModel.findById(
          new Types.ObjectId(accessToUserId),
        );

        if (!user) {
          throw new NotFoundException('User not found');
        }

        return await this.chapterMemberModel.findOneAndUpdate(
          { chapter: chapterMember.chapter, user: user._id },
          { $set: { role: 'moderator' } },
          { new: true },
        )

      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error updating admin access');
    }
  }

  /**
   * Assigns member role to a user in a specified entity (node or club).
   *
   * @param accessDto - Data transfer object containing entity details and user ID:
   *   - entity: The type of entity ('node' or 'club').
   *   - entityId: The ID of the entity where the role is to be assigned.
   *   - accessToUserId: The ID of the user to be granted the member role.
   *
   * @returns The updated node or club member document with the new member role.
   *
   * @throws NotFoundException - If the node or club member, or the user is not found.
   * @throws InternalServerErrorException - If an error occurs while updating admin access.
   */
  async makeMember(accessDto: AccessDto) {
    try {
      const { entity, entityId, accessToUserId } = accessDto;

      if (entity === 'node') {

        const nodeMember = await this.nodeMembersModel.findOne({
          node: new Types.ObjectId(entityId),
          user: new Types.ObjectId(accessToUserId),
        });
        if (!nodeMember) {
          throw new NotFoundException('Node Member not found');
        }

        const user = await this.userModel.findById(
          new Types.ObjectId(accessToUserId),
        );
        if (!user) {
          throw new NotFoundException('User not found');
        }

        return await this.nodeMembersModel.findOneAndUpdate(
          { node: nodeMember.node, user: user._id },
          { $set: { role: 'member' } },
          { new: true },
        );

      } else if (entity === 'club') {

        const clubMember = await this.clubMembersModel.findOne({
          club: new Types.ObjectId(entityId),
          user: new Types.ObjectId(accessToUserId),
        });
        if (!clubMember) {
          throw new NotFoundException('Club Member not found');
        }

        const user = await this.userModel.findById(
          new Types.ObjectId(accessToUserId),
        );
        if (!user) {
          throw new NotFoundException('User not found');
        }

        return await this.clubMembersModel.findOneAndUpdate(
          { club: clubMember.club, user: user._id },
          { $set: { role: 'member' } },
          { new: true },
        );

      } else if (entity === 'chapter') {

        const chapterMember = await this.chapterMemberModel.findOne({
          chapter: new Types.ObjectId(entityId),
          user: new Types.ObjectId(accessToUserId),
        });

        if (!chapterMember) {
          throw new NotFoundException('Chapter Member not found');
        }

        const user = await this.userModel.findById(
          new Types.ObjectId(accessToUserId),
        );

        if (!user) {
          throw new NotFoundException('User not found');
        }

        return await this.chapterMemberModel.findOneAndUpdate(
          { chapter: chapterMember.chapter, user: user._id },
          { $set: { role: 'member' } },
          { new: true },
        )

      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error updating admin access');
    }
  }

  /**
   * Removes a user from a node or club.
   *
   * @param accessDto - The data transfer object containing the entity type,
   *                    entity ID, and user ID of the user to be removed.
   *
   * @returns The deleted node or club member document.
   *
   * @throws NotFoundException - If the node or club member, or the user is not found.
   * @throws InternalServerErrorException - If an error occurs while updating admin access.
   */
  async removeMember(accessDto: AccessDto) {
    const session = await this.userModel.startSession();
    session.startTransaction();

    try {
      const { entity, entityId, accessToUserId } = accessDto;

      if (entity === 'node') {
        const nodeMember = await this.nodeMembersModel
          .findOne({
            node: new Types.ObjectId(entityId),
          })
          .session(session);

        if (!nodeMember) {
          throw new NotFoundException('Node Member not found');
        }

        const user = await this.userModel
          .findById(new Types.ObjectId(accessToUserId))
          .session(session);

        if (!user) {
          throw new NotFoundException('User not found');
        }

        const deletedMember = await this.nodeMembersModel
          .findOneAndDelete(
            { node: nodeMember.node, user: user._id },
            { new: true },
          )
          .session(session);

        await this.nodeJoinRequestModel
          .findOneAndDelete({
            node: nodeMember.node,
            user: user._id,
          })
          .session(session);

        await session.commitTransaction();
        return deletedMember;
      } else {
        const clubMember = await this.clubMembersModel
          .findOne({
            club: new Types.ObjectId(entityId),
          })
          .session(session);

        if (!clubMember) {
          throw new NotFoundException('Club Member not found');
        }

        const user = await this.userModel
          .findById(new Types.ObjectId(accessToUserId))
          .session(session);

        if (!user) {
          throw new NotFoundException('User not found');
        }

        const deletedMember = await this.clubMembersModel
          .findOneAndDelete(
            { club: clubMember.club, user: user._id },
            { new: true },
          )
          .session(session);

        await this.clubJoinRequestsModel
          .findOneAndDelete({
            club: new Types.ObjectId(entityId),
            user: new Types.ObjectId(accessToUserId),
          })
          .session(session);

        await session.commitTransaction();
        return deletedMember;
      }
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error updating admin access');
    } finally {
      await session.endSession();
    }
  }


  async updateDesignation(userId: string, memberId: string, nodeId: string, designation: string) {
    try {
      console.log({
        userId,
        memberId,
        nodeId,
      })
      // Check if the requesting user is an owner or admin of the specific node
      const userMembership = await this.nodeMembersModel.findOne({
        node: new Types.ObjectId(nodeId),
        user: new Types.ObjectId(userId),
        role: { $in: ['owner', 'admin'] },
        status: 'MEMBER'
      });

      // If user is not an owner or admin of the node, throw unauthorized exception
      // if (!userMembership) {
      //   throw new UnauthorizedException('Only owners and admins can update designations');
      // }

      // Check if the member being updated exists in the same node
      const memberToUpdate = await this.nodeMembersModel.findOne({
        node: new Types.ObjectId(nodeId),
        user: new Types.ObjectId(memberId),
        status: 'MEMBER'
      });

      if (!memberToUpdate) {
        throw new NotFoundException('Member not found in the node');
      }

      // Perform the update
      const result = await this.nodeMembersModel.updateOne(
        {
          _id: memberToUpdate._id
        },
        {
          $set: {
            designation
          }
        }
      );

      if (result.modifiedCount === 0) {
        throw new InternalServerErrorException('Failed to update designation');
      }

      return result;

    } catch (error) {
      console.log({ error })
      throw error
    }
  }

  async updatePosition(
    userId: string,
    memberId: string,
    nodeId: string,
    position: string
  ) {
    try {
      // Validate input parameters
      if (!userId || !memberId || !nodeId || !position) {
        throw new Error('Missing required parameters');
      }

      // Check if the requesting user is an owner or admin of the specific node
      const userMembership = await this.nodeMembersModel.findOne({
        node: new Types.ObjectId(nodeId),
        user: new Types.ObjectId(userId),
        role: { $in: ['owner', 'admin'] },
        status: 'MEMBER'
      });

      // If user is not an owner or admin of the node, throw unauthorized exception
      if (!userMembership) {
        throw new UnauthorizedException('Only owners and admins can update positions');
      }

      // Check if the member being updated exists in the same node
      const memberToUpdate = await this.nodeMembersModel.findOne({
        node: new Types.ObjectId(nodeId),
        user: new Types.ObjectId(memberId),
        status: 'MEMBER'
      });

      if (!memberToUpdate) {
        throw new NotFoundException('Member not found in the node');
      }

      // Perform the position update
      const result = await this.nodeMembersModel.updateOne(
        {
          _id: memberToUpdate._id
        },
        {
          $set: {
            position: position
          }
        }
      );

      if (result.modifiedCount === 0) {
        throw new InternalServerErrorException('Failed to update position');
      }

      return {
        success: true,
        message: 'Position updated successfully',
        result
      };

    } catch (error) {
      console.error('Error updating position:', error);
      throw error;
    }
  }

}
