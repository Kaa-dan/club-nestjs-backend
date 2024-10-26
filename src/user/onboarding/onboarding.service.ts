import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../auth/signup/entities/user.entity';
import { CreateDetailsDto } from './dto/create-details.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { UpdateInterestDto } from './dto/update-interest.dto';

import { ServiceResponse } from 'src/shared/types/service.response.type';
import { OnboardingStage } from './dto/onboarding-stages.enum';

@Injectable()
export class OnboardingService {
  private readonly stageOrder = [
    OnboardingStage.DETAILS,
    OnboardingStage.IMAGE,
    OnboardingStage.INTEREST,
    OnboardingStage.NODE,
  ];

  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  private getNextStage(currentStage: string): string {
    const currentIndex = this.stageOrder.indexOf(
      currentStage as OnboardingStage,
    );
    if (currentIndex === -1 || currentIndex === this.stageOrder.length - 1) {
      return currentStage;
    }
    return this.stageOrder[currentIndex + 1];
  }

  async createDetails(
    id: string,
    createDetailsDto: CreateDetailsDto,
  ): Promise<ServiceResponse> {
    try {
      console.log({ id });
      const user = await this.userModel.findOne({ _id: id });
      console.log({ user });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.onBoardingStage !== OnboardingStage.DETAILS) {
        throw new BadRequestException('Invalid onboarding stage');
      }

      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          id,
          {
            $set: {
              ...createDetailsDto,
              onBoardingStage: this.getNextStage(OnboardingStage.DETAILS),
            },
          },
          { new: true, runValidators: true },
        )
        .select('-password');

      return {
        success: true,
        data: updatedUser,
        status: 200,
        message: 'User details updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        status: error.status || 500,
        message: error.message || 'Internal Server Error',
      };
    }
  }

  async updateImages(
    id: string,
    updateImageDto: UpdateImageDto,
  ): Promise<ServiceResponse> {
    try {
      const user = await this.userModel.findById(id);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.onBoardingStage !== OnboardingStage.IMAGE) {
        throw new BadRequestException('Invalid onboarding stage');
      }

      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          id,
          {
            $set: {
              ...updateImageDto,
              onBoardingStage: this.getNextStage(OnboardingStage.IMAGE),
            },
          },
          { new: true, runValidators: true },
        )
        .select('-password');

      return {
        success: true,
        data: updatedUser,
        status: 200,
        message: 'User images updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        status: error.status || 500,
        message: error.message || 'Internal Server Error',
      };
    }
  }

  async updateInterests(
    id: string,
    updateInterestDto: UpdateInterestDto,
  ): Promise<ServiceResponse> {
    try {
      const user = await this.userModel.findById(id);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.onBoardingStage !== OnboardingStage.INTEREST) {
        throw new BadRequestException('Invalid onboarding stage');
      }

      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          id,
          {
            $set: {
              interests: updateInterestDto.interests,
              onBoardingStage: this.getNextStage(OnboardingStage.INTEREST),
            },
          },
          { new: true, runValidators: true },
        )
        .select('-password');

      return {
        success: true,
        data: updatedUser,
        status: 200,
        message: 'User interests updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        status: error.status || 500,
        message: error.message || 'Internal Server Error',
      };
    }
  }

  async completeOnboarding(id: string): Promise<ServiceResponse> {
    try {
      const user = await this.userModel.findById(id);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.onBoardingStage !== OnboardingStage.NODE) {
        throw new BadRequestException('Invalid onboarding stage');
      }

      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          id,
          {
            $set: {
              isOnBoarded: true,
            },
          },
          { new: true, runValidators: true },
        )
        .select('-password');

      return {
        success: true,
        data: updatedUser,
        status: 200,
        message: 'Onboarding completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        status: error.status || 500,
        message: error.message || 'Internal Server Error',
      };
    }
  }
}
