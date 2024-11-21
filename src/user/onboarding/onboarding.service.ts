import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
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
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly uploadService: UploadService,
  ) { }

  private getNextStage(currentStage: string): string {
    const currentIndex = this.stageOrder.indexOf(
      currentStage as OnboardingStage,
    );
    if (currentIndex === -1 || currentIndex === this.stageOrder.length - 1) {
      return currentStage;
    }
    return this.stageOrder[currentIndex + 1];
  }

  /**
   * Retrieves the onboarding details of a user by their ID.
   *
   * @param id - The ID of the user whose onboarding details are to be fetched.
   * @returns A promise that resolves to a ServiceResponse containing the user's onboarding
   *          details if found, or an error message if the user is not found or an error occurs.
   * @throws NotFoundException if the user is not found.
   */
  async getOnboarding(id: string): Promise<ServiceResponse> {
    try {
      const user = await this.userModel.findById(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return {
        success: true,
        data: user,
        status: 200,
        message: 'User onboarding details retrieved successfully',
      };
    } catch (error) {
      console.log(error);
      if (error instanceof NotFoundException)
        throw new NotFoundException(error.message);
      throw new BadRequestException('Internal Server Error');
    }
  }

  async createDetails(id: string, createDetailsDto: CreateDetailsDto) {
    try {
      const user = await this.userModel.findOne({ _id: id });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const isUserNameExists = await this.userModel.findOne({
        userName: createDetailsDto.userName,
      });

      if (isUserNameExists) {
        throw new BadRequestException('userName already exists');
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
      if (error instanceof BadRequestException)
        throw new BadRequestException(error.message);
      if (error instanceof NotFoundException)
        throw new NotFoundException(error.message);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  async updateImages(
    id,
    imageFiles: {
      profileImage?: Express.Multer.File;
      coverImage?: Express.Multer.File;
    },
  ) {
    try {
      const user = await this.userModel.findById(id);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const updateData: {
        profileImage?: string;
        coverImage?: string;
      } = {};

      // Handle profile image upload
      if (imageFiles.profileImage) {
        const profileImageResult = await this.uploadService.uploadFile(
          imageFiles.profileImage.buffer,
          imageFiles.profileImage.originalname,
          imageFiles.profileImage.mimetype,
          'user',
        );
        console.log({ user });
        // Delete old profile image if it exists
        if (user.profileImage && user.signupThrough === 'gmail') {
          await this.uploadService.deleteFile(user.profileImage);
        }

        // Create ImageData object with correct typing
        updateData.profileImage = profileImageResult.url;
      }

      // Handle cover image upload
      if (imageFiles.coverImage) {
        const coverImageResult = await this.uploadService.uploadFile(
          imageFiles.coverImage.buffer,
          imageFiles.coverImage.originalname,
          imageFiles.coverImage.mimetype,
          'user',
        );

        // Delete old cover image if it exists
        if (user.coverImage && user.signupThrough === 'gmail') {
          await this.uploadService.deleteFile(user.coverImage);
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
      console.log(error);
      if (error instanceof InternalServerErrorException)
        throw new InternalServerErrorException(error.message);
      if (error instanceof NotFoundException)
        throw new NotFoundException(error.message);
      throw new BadRequestException('Internal Server Error');
    }
  }

  async updateInterests(id: string, updateInterestDto: UpdateInterestDto) {
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
      if (error instanceof BadRequestException)
        throw new BadRequestException(error.message);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  async completeOnboarding(id: string) {
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
      if (error instanceof BadRequestException)
        throw new BadRequestException(error.message);
      throw new InternalServerErrorException('Internal Server Error');
    }
  }
}
