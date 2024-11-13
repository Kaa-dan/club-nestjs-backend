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

@Injectable()
export class UserService {
  constructor(@InjectModel('users') private readonly userModel: Model<User>) { }

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
      throw new BadRequestException('Term not found')
    }
    try {
      const user = await this.userModel.findOne({ userName: term }, { password: 0 })
      if (!user) {
        return {
          data: null,
          message: "user not found successfully",
          success: false
        }
      }

      return {
        data: user,
        message: "user found successfully",
        success: true
      }
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
      const users = await this.userModel.find(
        {
          $or: [
            { userName: caseInsensitive },
            { firstName: caseInsensitive },
            { lastName: caseInsensitive },
          ],
        },
        { password: 0 }
      ).lean().exec();

      if (!users || users.length === 0) {
        return [];
      }

      const userNameUsers = [];
      const otherUsers = [];

      for (const user of users) {
        if (user.userName && user.userName.toLowerCase().includes(term.toLowerCase())) {
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
}
