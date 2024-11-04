import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Put,
  Req,
  UploadedFiles,
} from '@nestjs/common';
import { CreateDetailsDto } from './dto/create-details.dto';

import { OnboardingService } from './onboarding.service';
import { UploadService } from 'src/shared/upload/upload.service';
import { UpdateInterestDto } from './dto/update-interest.dto';
import { Request } from 'express';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onBoardingService: OnboardingService) {}

  @Put('details')
  async createDetails(
    @Body() createDetailsDto: CreateDetailsDto,
    @Req() req: Request,
  ) {
    try {
      return await this.onBoardingService.createDetails(
        String(req.user._id),
        createDetailsDto,
      );
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || 'Internal Server Error',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('images')
  async updateImages(
    @UploadedFiles()
    files: {
      profileImage?: Express.Multer.File[];
      coverImage?: Express.Multer.File[];
    },
    @Req() req: Request,
  ) {
    try {
      const imageFiles = {
        profileImage: files?.profileImage?.[0],
        coverImage: files?.coverImage?.[0],
      };

      return await this.onBoardingService.updateImages(
        String(req.user._id),
        imageFiles,
      );
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || 'Internal Server Error',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('interest')
  async updateInterest(
    @Body() updateInterestDto: UpdateInterestDto,
    @Req() req: Request,
  ) {
    try {
      return await this.onBoardingService.updateInterests(
        String(req.user._id),
        updateInterestDto,
      );
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || 'Internal Server Error',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('complete')
  async completeOnboarding(@Req() req: Request) {
    try {
      return await this.onBoardingService.completeOnboarding(
        String(req.user._id),
      );
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || 'Internal Server Error',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
