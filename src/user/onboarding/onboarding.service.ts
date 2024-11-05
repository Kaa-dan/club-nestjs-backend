import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateDetailsDto } from './dto/create-details.dto';
import { UpdateInterestDto } from './dto/update-interest.dto';
import { ServiceResponse } from 'src/shared/types/service.response.type';
import { OnboardingStage } from './dto/onboarding-stages.enum';
import { UploadService } from 'src/shared/upload/upload.service';
import { User } from 'src/shared/entities/user.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class OnboardingService {
  private readonly stageOrder = [
    OnboardingStage.DETAILS,
    OnboardingStage.IMAGE,
    OnboardingStage.INTEREST,
    OnboardingStage.NODE,
    OnboardingStage.COMPLETED,
  ];

  constructor(
    @InjectModel('users') private userModel: Model<User>,
    private readonly uploadService: UploadService,
  ) {}

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
      const user = await this.userModel.findOne({ _id: id });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // if (user.onBoardingStage !== OnboardingStage.DETAILS) {
      //   throw new BadRequestException('Invalid onboarding stage');
      // }

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
    id,
    imageFiles: {
      profileImage?: Express.Multer.File;
      coverImage?: Express.Multer.File;
    },
  ): Promise<ServiceResponse> {
    try {
      const user = await this.userModel.findById(id);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // if (user.onBoardingStage !== OnboardingStage.IMAGE) {
      //   throw new BadRequestException('Invalid onboarding stage');
      // }

      const updateData: {
        profileImage?: string;
        coverImage?: string;
      } = {};

      // Handle profile image upload
      if (imageFiles.profileImage) {
        const profileImageResult = await this.uploadService.uploadFile(
          imageFiles.profileImage.buffer,
          imageFiles.profileImage.filename,
          imageFiles.profileImage.mimetype,
          'user',
        );

        // Delete old profile image if it exists
        if (user.profileImage) {
          try {
            await this.uploadService.deleteFile(user.profileImage);
          } catch (error) {
            console.error('Error deleting old profile image:', error);
          }
        }

        // Create ImageData object with correct typing
        updateData.profileImage = profileImageResult.url;
      }

      // Handle cover image upload
      if (imageFiles.coverImage) {
        const coverImageResult = await this.uploadService.uploadFile(
          imageFiles.coverImage.buffer,
          imageFiles.coverImage.filename,
          imageFiles.coverImage.mimetype,
          'user',
        );

        // Delete old cover image if it exists
        if (user.coverImage) {
          try {
            await this.uploadService.deleteFile(user.coverImage);
          } catch (error) {
            console.error('Error deleting old cover image:', error);
          }
        }

        // Create ImageData object with correct typing
        updateData.coverImage = coverImageResult.url;
      }

      // Update user with new image data
      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          id,
          {
            $set: updateData,
            onBoardingStage: this.getNextStage(OnboardingStage.IMAGE),
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

      // if (user.onBoardingStage !== OnboardingStage.INTEREST) {
      //   throw new BadRequestException('Invalid onboarding stage');
      // }

      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          id,
          {
            $set: {
              ...updateInterestDto,
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

      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          id,
          {
            $set: {
              isOnBoarded: true,
              onBoardingStage: 'completed',
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
