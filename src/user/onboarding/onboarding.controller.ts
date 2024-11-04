import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Put,
  UploadedFiles,
} from '@nestjs/common';
import { CreateDetailsDto } from './dto/create-details.dto';

import { OnboardingService } from './onboarding.service';
import { UploadService } from 'src/shared/upload/upload.service';
import { UpdateInterestDto } from './dto/update-interest.dto';



@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly onBoardingService: OnboardingService,
 
  ) {}

  @Put('details/:id')
  async createDetails(
    @Param('id') id: string,
    @Body() createDetailsDto: CreateDetailsDto,
  ) {
    try {
      return await this.onBoardingService.createDetails(id, createDetailsDto);
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

  @Put('images/:id')
  async updateImages(
    @Param('id') id: string,

    @UploadedFiles()
    files: {
      profileImage?: Express.Multer.File[];
      coverImage?: Express.Multer.File[];
    },
  ) {
    try {
      const imageFiles = {
        profileImage: files?.profileImage?.[0],
        coverImage: files?.coverImage?.[0],
      };

      return await this.onBoardingService.updateImages(id, imageFiles);
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

  @Put('interest/:id')
  async updateInterest(
    @Param('id') id: string,
    @Body() updateInterestDto: UpdateInterestDto,
  ){
    try {
      return await this.onBoardingService.updateInterests(id, updateInterestDto);
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
