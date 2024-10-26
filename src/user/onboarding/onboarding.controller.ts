import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Put,
} from '@nestjs/common';
import { CreateDetailsDto } from './dto/create-details.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { UpdateInterestDto } from './dto/update-interest.dto';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Put('details/:id')
  async createDetails(
    @Param('id') id: string,
    @Body() createDetailsDto: CreateDetailsDto,
  ) {
    try {
      return await this.onboardingService.createDetails(id, createDetailsDto);
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

  //   @Put('images/:id')
  //   async updateImages(
  //     @Param('id') id: string,
  //     @Body() updateImageDto: UpdateImageDto,
  //   ) {
  //     try {
  //       return await this.onboardingService.updateImages(id, updateImageDto);
  //     } catch (error) {
  //       throw new HttpException(
  //         {
  //           success: false,
  //           status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
  //           message: error.message || 'Internal Server Error',
  //         },
  //         error.status || HttpStatus.INTERNAL_SERVER_ERROR,
  //       );
  //     }
  //   }

  //   @Put('interests/:id')
  //   async updateInterests(
  //     @Param('id') id: string,
  //     @Body() updateInterestDto: UpdateInterestDto,
  //   ) {
  //     try {
  //       return await this.onboardingService.updateInterests(
  //         id,
  //         updateInterestDto,
  //       );
  //     } catch (error) {
  //       throw new HttpException(
  //         {
  //           success: false,
  //           status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
  //           message: error.message || 'Internal Server Error',
  //         },
  //         error.status || HttpStatus.INTERNAL_SERVER_ERROR,
  //       );
  //     }
  //   }

  //   @Put('complete/:id')
  //   async completeOnboarding(@Param('id') id: string) {
  //     try {
  //       return await this.onboardingService.completeOnboarding(id);
  //     } catch (error) {
  //       throw new HttpException(
  //         {
  //           success: false,
  //           status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
  //           message: error.message || 'Internal Server Error',
  //         },
  //         error.status || HttpStatus.INTERNAL_SERVER_ERROR,
  //       );
  //     }
  //   }
}
