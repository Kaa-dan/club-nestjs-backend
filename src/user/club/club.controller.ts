import {
  Body,
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  NotFoundException,
  Req,
} from '@nestjs/common';

import { ClubService } from './club.service';
import { Club } from 'src/shared/entities/club.entity';
import {
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';

import { CreateClubDto, UpdateClubDto } from './dto/club.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from 'src/shared/pipes/file-validation.pipe';
import { SkipAuth } from 'src/decorators/skip-auth.decorator';
import { Request } from 'express';
import { Types } from 'mongoose';

// @SkipAuth()
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
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'profileImage', maxCount: 1 },
      { name: 'coverImage', maxCount: 1 },
    ]),
  )

  //method for create club
  async createClub(
    @Req() req: Request,
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
    if (!files?.profileImage?.[0] || !files?.coverImage?.[0]) {
      throw new BadRequestException(
        'Both profile and cover images are required',
      );
    }

    if (
      !createClubDto.name ||
      !createClubDto.about ||
      !createClubDto.description
    ) {
      throw new BadRequestException(
        'Name, about, and description are required fields',
      );
    }

    // Convert string ID to ObjectId
    const userId = new Types.ObjectId(req.user._id);

    return await this.clubService.createClub({
      ...createClubDto,
      profileImage: files?.profileImage[0],
      coverImage: files?.coverImage[0],
      createdBy: userId,
    });
  }
  /*
  --------------------GETTING ALL CLUBS----------------------------

  @Returns {Promise<Club>} - All clubs
  */

  @Get()
  @ApiOperation({ summary: 'Get all clubs' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all clubs',
    type: [Club],
  })
  //   method to get all clubs
  async getAllClubs() {
    return await this.clubService.getAllClubs();
  }

  /*
  --------------------GETTING SINGLE CLUB----------------------------

  @Returns {Promise<Club>} - SINGLE CLUB
  */

  @Get(':id')
  @ApiOperation({ summary: 'Get a club by id' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the club',
    type: Club,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Club not found',
  })
  //method to  get one club
  async getClub(@Param('id') id: string) {
    const club = await this.clubService.getClubById(id);
    if (!club) {
      throw new NotFoundException('Club not found');
    }
    return club;
  }

  /*
  --------------------UPDATING ONE CLUB----------------------------

  @Param {string} id - The id of the club to update  @ID to create a new club
  @Returns {Promise<Club>} - The updated  club 
  */

  @Put(':id')
  @ApiOperation({ summary: 'Update a club' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The club has been successfully updated.',
    type: Club,
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'profileImage', maxCount: 1 },
      { name: 'coverImage', maxCount: 1 },
    ]),
  )
  async updateClub(
    @Param('id') id: string,
    @UploadedFiles(
      new FileValidationPipe({
        profileImage: {
          maxSizeMB: 5,
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png'],
          required: false,
        },
        coverImage: {
          maxSizeMB: 10,
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png'],
          required: false,
        },
      }),
    )
    files: {
      profileImage?: Express.Multer.File[];
      coverImage?: Express.Multer.File[];
    },
    @Body() updateClubDto: UpdateClubDto,
  ) {
    return await this.clubService.updateClub(id, {
      ...updateClubDto,
      profileImage: files?.profileImage?.[0],
      coverImage: files?.coverImage?.[0],
    });
  }

  /*
  --------------------DELETE A CLUB----------------------------

  @Returns {Promise<Club>} - The deleted club 
  */

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a club' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The club has been successfully deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Club not found',
  })
  async deleteClub(@Param('id') id: string) {
    return await this.clubService.deleteClub(id);
  }
}
