import {
  Body,
  Controller,
  Post,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';

import { ClubService } from './club.service';

import { Club } from 'src/shared/entities/club.entity';

import {
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CreateClubDto } from './dto/club.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from 'src/shared/pipes/file-validation.pipe';
import { SkipAuth } from 'src/decorators/skip-auth.decorator';

@SkipAuth()
@ApiTags('Clubs')
@Controller('clubs')
export class ClubController {
  constructor(private readonly clubService: ClubService) {}

  /*
  --------------------CREATING A CLUB----------------------------

  @Body {CreateClubDto} createClubDto - The data to create a new club
  @Returns {Promise<Club>} - The created club 
  */

  @Post()
  @ApiOperation({ summary: 'Create a new club' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The club has been successfully created.',
    type: Club,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })

  //file interceptor
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'profileImage', maxCount: 1 },
      { name: 'coverImage', maxCount: 1 },
    ]),
  )

  //method for create club
  async createClub(
    @UploadedFiles(
      new FileValidationPipe({
        profileImage: {
          maxSizeMB: 5,
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png'],
          required: true,
        },
        coverImage: {
          maxSizeMB: 10,
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png'],
          required: true,
        },
      }),
    )
    files: {
      profileImage: Express.Multer.File[];
      coverImage: Express.Multer.File[];
    },
    @Body() createClubDto: CreateClubDto,
  ) {
    // Validate that we have both required fields
    if (!files?.profileImage?.[0] || !files?.coverImage?.[0]) {
      throw new BadRequestException(
        'Both profile and cover images are required',
      );
    }
    console.log({ createClubDto });
    // Validate other required fields from DTO
    if (
      !createClubDto.name ||
      !createClubDto.about ||
      !createClubDto.description
    ) {
      throw new BadRequestException(
        'Name, about, and description are required fields',
      );
    }

    return await this.clubService.createClub({
      ...createClubDto,
      profileImage: files?.profileImage[0],
      coverImage: files?.coverImage[0],
    });
  }
}
