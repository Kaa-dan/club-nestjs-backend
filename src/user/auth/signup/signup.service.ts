import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { hashPassword } from 'src/utils';
import { User, ImageData } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import {
  UpdateUserDto,
  UpdateUserImagesDto,
} from 'src/user/onboarding/dto/update-user.dto';

interface OnBoardingData {
  userId: string;
  stage: 'details' | 'image' | 'interest' | 'node';
  data: any;
}

@Injectable()
export class SignupService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async signUp(
    signupData: CreateUserDto,
  ): Promise<{ status: boolean; message: string; data?: any }> {
    const { email, password } = signupData;

    const existingUser = await this.userModel.findOne({
      email,
    });
    console.log(existingUser, 'exx');

    if (existingUser && existingUser?.registered) {
      throw new ConflictException('Email or username already exists');
    }

    try {
      const hashedPassword = await hashPassword(password);

      existingUser.password = hashedPassword;

      existingUser.registered = true;

      //for identifying the step
      // existingUser.isOnBoarded = 1;

      await existingUser.save();

      // Return a success response with a status and message
      return {
        status: true,
        message: 'User created successfully',
        data: existingUser,
      };
    } catch (error) {
      console.error('Error in signup:', error);
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async onBoarding(
    onBoardingData: OnBoardingData,
  ): Promise<{ status: boolean; message: string; data: any }> {
    const { userId, stage, data } = onBoardingData;

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    try {
      switch (stage) {
        case 'details':
          await this.handleDetailsUpdate(user, data as UpdateUserDto);
          break;

        case 'image':
          await this.handleImageUpdate(
            user,
            data as {
              profileImage?: UpdateUserImagesDto;
              coverImage?: UpdateUserImagesDto;
            },
          );
          break;

        default:
          throw new BadRequestException('Invalid onboarding stage');
      }

      user.isOnBoarded = true;
      await user.save();

      return {
        status: true,
        message: `${stage} stage completed successfully`,
        data: user,
      };
    } catch (error) {
      console.error(`Error in onboarding ${stage} stage:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to complete ${stage} stage`,
      );
    }
  }

  private async handleDetailsUpdate(
    user: User,
    data: UpdateUserDto,
  ): Promise<void> {
    // Update only provided fields
    if (data.firstName) user.firstName = data.firstName;
    if (data.lastName) user.lastName = data.lastName;
    if (data.gender) user.gender = data.gender;
    if (data.dateOfBirth) user.dateOfBirth = new Date(data.dateOfBirth);
    if (data.phoneNumber) user.phoneNumber = data.phoneNumber;

    user.onBoardingStage = 'details';
    await user.save();
  }

  private async handleImageUpdate(
    user: User,
    data: {
      profileImage?: UpdateUserImagesDto;
      coverImage?: UpdateUserImagesDto;
    },
  ): Promise<void> {
    if (data.profileImage) {
      user.profileImage = data.profileImage as ImageData;
    }

    if (data.coverImage) {
      user.coverImage = data.coverImage as ImageData;
    }

    user.onBoardingStage = 'image';
    await user.save();
  }
}
