import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateUserDto } from './dto/create-user.dto';
import { hashPassword } from 'src/utils';
import { User } from './entities/user.entity';

// Define types for different stages
interface UserDetails {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  phoneNumber?: string;
}

interface UserImage {
  profileImage: string;
  coverImage?: string;
}

interface UserInterest {
  interests: string[];
  categories: string[];
}

interface UserNode {
  location: {
    type: string;
    coordinates: [number, number];
  };
  preferredLanguages?: string[];
}

// Combined type for all onboarding data
interface OnBoardingData {
  userId: string;
  stage: 'details' | 'image' | 'interest' | 'node';
  data: UserDetails | UserImage | UserInterest | UserNode;
}
@Injectable()
export class SignupService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async signUp(
    signupData: CreateUserDto,
  ): Promise<{ status: boolean; message: string; data: any }> {
    const { email, password } = signupData;

    const existingUser = await this.userModel.findOne({
      email,
    });

    if (existingUser && existingUser?.registered) {
      throw new ConflictException('Email or username already exists');
    }

    try {
      const hashedPassword = await hashPassword(password);

      existingUser.password = hashedPassword;

      existingUser.registered = true;

      const createdUser = await existingUser.save();

      // Return a success response with a status and message
      return {
        status: true,
        message: 'User created successfully',
        data: createdUser,
      };
    } catch (error) {
      console.log(error, 'errr');

      throw error;
    }
  }
  async onBoarding(
    onBoardingData: OnBoardingData,
  ): Promise<{ status: boolean; message: string; data: any }> {
    const { userId, stage, data } = onBoardingData;

    // Find the user
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    try {
      // Handle different stages
      switch (stage) {
        case 'details':
          await this.handleDetailsStage(user, data as UserDetails);
          break;

        case 'image':
          await this.handleImageStage(user, data as UserImage);
          break;

        // case 'interest':
        //   await this.handleInterestStage(user, data as UserInterest);
        //   break;

        // case 'node':
        //   await this.handleNodeStage(user, data as UserNode);
        //   break;

        default:
          throw new BadRequestException('Invalid onboarding stage');
      }

      // Update onboarding progress
      // user.onboardingCompleted = this.checkOnboardingCompletion(user);
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

  private async handleDetailsStage(
    user: User,
    data: UserDetails,
  ): Promise<void> {
    // Validate required fields
    if (
      !data.firstName ||
      !data.lastName ||
      !data.dateOfBirth ||
      !data.gender
    ) {
      throw new BadRequestException('Missing required details');
    }

    // Update user details
    user.firstName = data.firstName;
    user.lastName = data.lastName;
    user.dateOfBirth = new Date(data.dateOfBirth);
    user.gender = data.gender;
    user.phoneNumber = data.phoneNumber;
    user.onBoardingStage = 'details';

    await user.save();
  }

  private async handleImageStage(user: User, data: UserImage): Promise<void> {
    // Validate profile image
    if (!data.profileImage) {
      throw new BadRequestException('Profile image is required');
    }

    // Update user images
    user.profileImage = data.profileImage;
    user.coverImage = data.coverImage;
    user.onBoardingStage = 'image';

    await user.save();
  }

  // private async handleInterestStage(
  //   user: User,
  //   data: UserInterest,
  // ): Promise<void> {
  //   // Validate interests
  //   if (!data.interests?.length) {
  //     throw new BadRequestException('At least one interest is required');
  //   }

  //   // Update user interests
  //   // user.interests = data.interests;
  //   // user.categories = data.categories || [];
  //   user.onBoardingStage =  'interest';

  //   await user.save();
  // }

  // private async handleNodeStage(user: User, data: UserNode): Promise<void> {
  //   // Validate location
  //   if (!data.location?.coordinates || data.location.coordinates.length !== 2) {
  //     throw new BadRequestException('Valid location coordinates are required');
  //   }

  //   // Update user node information
  //   user.location = data.location;
  //   user.preferredLanguages = data.preferredLanguages || [];
  //   user.onBoardingStage = [...user.onBoardingStage, 'node'];

  //   await user.save();
  // }

  // private checkOnboardingCompletion(user: User): boolean {
  //   const requiredStages = ['details', 'image', 'interest', 'node'];
  //   return requiredStages.every((stage) =>
  //     user.onBoardingStage.includes(stage),
  //   );
  // }
}
