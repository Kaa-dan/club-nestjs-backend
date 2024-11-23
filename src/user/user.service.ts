import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { UserResponseDto } from './dto/user.dto';
import { plainToClass } from 'class-transformer';
import { User } from 'src/shared/entities/user.entity';
import { UserWithoutPassword } from './dto/user.type';
import { AccessDto } from './dto/access.dto';
import { NodeMembers } from 'src/shared/entities/node-members.entity';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(NodeMembers.name) private readonly nodeMembersModel: Model<NodeMembers>,
    @InjectModel(ClubMembers.name) private readonly clubMembersModel: Model<ClubMembers>,
  ) { }

  async getAllUsers(search: string): Promise<UserWithoutPassword[]> {
    try {
      const searchRegex = new RegExp(search, 'i'); // case-insensitive search

      const users = await this.userModel
        .find({
          $or: [
            { firstName: { $regex: searchRegex } },
            { lastName: { $regex: searchRegex } },
            { email: { $regex: searchRegex } },
          ],
        })
        .select('-password')
        .lean()
        .exec();

      return users as unknown as UserWithoutPassword[];
    } catch (error) {
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
      console.log(error);
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
          message: 'user not found successfully',
          success: false,
        };
      }

      return {
        data: user,
        message: 'user found successfully',
        success: true,
      };
    } catch (error) {
      console.log(error);
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
          isLogged: false
        };
      }
      return { isLogged: true, user };
    } catch (error) {

    }
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

        const nodeMember = await this.nodeMembersModel.findOne({ node: new Types.ObjectId(entityId) });
        if (!nodeMember) {
          throw new NotFoundException('Node Member not found');
        }

        const user = await this.userModel.findById(new Types.ObjectId(accessToUserId));
        if (!user) {
          throw new NotFoundException('User not found');
        }

        return await this.nodeMembersModel.findOneAndUpdate(
          { node: nodeMember.node, user: user._id },
          { $set: { role: 'admin' } },
          { new: true }
        );

      } else {

        const clubMember = await this.clubMembersModel.findOne({ club: new Types.ObjectId(entityId) });
        if (!clubMember) {
          throw new NotFoundException('Club Member not found');
        }

        const user = await this.userModel.findById(new Types.ObjectId(accessToUserId));
        if (!user) {
          throw new NotFoundException('User not found');
        }

        return await this.clubMembersModel.findOneAndUpdate(
          { club: clubMember.club, user: user._id },
          { $set: { role: 'admin' } },
          { new: true }
        );

      }

    } catch (error) {
      console.log(error, 'error');
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
      const { entity, entityId, accessToUserId } = accessDto

      if (entity === 'node') {

        const nodeMember = await this.nodeMembersModel.findOne({ node: new Types.ObjectId(entityId) });
        if (!nodeMember) {
          throw new NotFoundException('Node Member not found');
        }

        const user = await this.userModel.findById(new Types.ObjectId(accessToUserId));
        if (!user) {
          throw new NotFoundException('User not found');
        }

        return await this.nodeMembersModel.findOneAndUpdate(
          { node: nodeMember.node, user: user._id },
          { $set: { role: 'moderator' } },
          { new: true }
        );

      } else {

        const clubMember = await this.clubMembersModel.findOne({ club: new Types.ObjectId(entityId) });
        if (!clubMember) {
          throw new NotFoundException('Club Member not found');
        }

        const user = await this.userModel.findById(new Types.ObjectId(accessToUserId));
        if (!user) {
          throw new NotFoundException('User not found');
        }

        return await this.clubMembersModel.findOneAndUpdate(
          { club: clubMember.club, user: user._id },
          { $set: { role: 'moderator' } },
          { new: true }
        )
      }
    } catch (error) {
      console.log(error, 'error');
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
      const { entity, entityId, accessToUserId } = accessDto

      if (entity === 'node') {

        const nodeMember = await this.nodeMembersModel.findOne({ node: new Types.ObjectId(entityId) });
        if (!nodeMember) {
          throw new NotFoundException('Node Member not found');
        }

        const user = await this.userModel.findById(new Types.ObjectId(accessToUserId));
        if (!user) {
          throw new NotFoundException('User not found');
        }

        return await this.nodeMembersModel.findOneAndUpdate(
          { node: nodeMember.node, user: user._id },
          { $set: { role: 'member' } },
          { new: true }
        );

      } else {

        const clubMember = await this.clubMembersModel.findOne({ club: new Types.ObjectId(entityId) });
        if (!clubMember) {
          throw new NotFoundException('Club Member not found');
        }

        const user = await this.userModel.findById(new Types.ObjectId(accessToUserId));
        if (!user) {
          throw new NotFoundException('User not found');
        }

        return await this.clubMembersModel.findOneAndUpdate(
          { club: clubMember.club, user: user._id },
          { $set: { role: 'member' } },
          { new: true }
        )
      }

    } catch (error) {
      console.log(error, 'error');
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error updating admin access');
    }
  }
}
