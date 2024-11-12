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
  Query,
} from '@nestjs/common';

import { ClubService } from './club.service';
import { Club } from 'src/shared/entities/club.entity';
import {
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { CreateClubDto, UpdateClubDto } from './dto/club.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from 'src/shared/pipes/file-validation.pipe';
import { SkipAuth } from 'src/decorators/skip-auth.decorator';
import { Request } from 'express';
import { Types } from 'mongoose';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';

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
    console.log({ userId });
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
  async getAllClubs() {
    return await this.clubService.getAllClubs();
  }
  /*
  --------------------GETTING  CLUBS OF THE SPECIFIED USER----------------------------
  */
  @Get('user-clubs')
  @ApiOperation({ summary: 'Get all clubs of a user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all clubs of the user',
    type: [Club],
  })
  async getAllClubsOfUser(@Req() req: Request) {
    const userId = new Types.ObjectId(req.user._id);
    return await this.clubService.getAllClubsOfUser(userId);
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

  /*
  --------------------GETTING  ALL REQUESTS OF THE SPECIFIED CLUB----------------------------
  */
  @Get('club-requests/:clubId')
  @ApiOperation({ summary: 'Get all requests of a club' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all requests of the club',
    type: [ClubMembers],
  })
  async getAllRequestsOfClub(@Param('clubId') clubId: string) {
    const CLUBID = new Types.ObjectId(clubId);
    return await this.clubService.getAllRequestsOfClub(CLUBID);
  }

  //---------------------GETTING ALL REQUESTS OF THE SPECIFIED USER ----------------------------
  @Get('user-join-requests')
  @ApiOperation({ summary: 'Get all requests of a user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all requests of the user',
    type: [ClubMembers],
  })
  async getAllRequestsOfUser(@Req() req: Request) {
    const userId = new Types.ObjectId(req.user._id);
    return await this.clubService.getAllRequestsOfUser(userId);
  }


  /*----------------------REQUESTING OR JOINING THE CLUB---------------
  @PARAM groupId @user :userId*/
  @Put('request-join/:clubId')
  @ApiOperation({ summary: 'Request or join a club' })
  @ApiParam({ name: 'groupId', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Request or join a club',
    type: ClubMembers,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Club not found',
  })
  async requestOrJoinClub(
    @Req() req: Request,
    @Param('clubId') clubId: string,
  ) {
    //service
    const userId = new Types.ObjectId(req.user._id);
    const CLUBID = new Types.ObjectId(clubId);
    // retuning response
    return await this.clubService.requestOrJoinClub(CLUBID, userId);
  }

  //---------------------CANCEL JOIN REQUEST OF THE CLUB---------------
  @Delete('cancel-join-request/:clubId')
  async cancelJoinRequest(@Req() req: Request, @Param('clubId') clubId: string) {
    const userId = new Types.ObjectId(req.user._id);
    const CLUBID = new Types.ObjectId(clubId);
    return await this.clubService.cancelJoinRequest(CLUBID, userId);
  }

  /*----------------------------CHECKING THE STATUS OF THE USER OF A CLUB---------------------------- */

  @Get('check-status/:clubId')
  @ApiOperation({ summary: 'Check the status of the user in a club' })
  @ApiParam({ name: 'clubId', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the status of the user in the club',
    type: ClubMembers,
  })
  async checkStatus(@Req() req: Request, @Param('clubId') clubId: string) {
    const userId = new Types.ObjectId(req.user._id);
    const CLUBID = new Types.ObjectId(clubId);
    return await this.clubService.checkStatus(CLUBID, userId);
  }

  /* ------------------GETTING ALL THE MEMBERS OF THE SINGLE CLUB------------------------- */
  @Get('club-members/:clubId')
  @ApiOperation({ summary: 'Get all members of a club' })
  @ApiParam({ name: 'clubId', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all members of the club',
    type: [ClubMembers],
  })
  async getAllMembersOfClub(@Param('clubId') clubId: string) {
    const CLUBID = new Types.ObjectId(clubId);
    return await this.clubService.getAllMembersOfClub(CLUBID);
  }

  /*----------------SEARCHING FOR MEMBER OF THE SINGLE CLUB ------------------------*/
  @Get('search-member/:clubId')
  @ApiParam({
    name: 'clubId',
    type: 'string',
    description: 'The ID of the club to search in',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: 'string',
    description: 'Search term for filtering members',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the members of the club matching the search criteria',
    type: [ClubMembers],
  })
  async searchMemberOfClub(
    @Param('clubId') clubId: Types.ObjectId,
    @Query('search') search: string = '',
  ) {
    console.log({ clubId, search });
    return await this.clubService.searchMemberOfClub(
      new Types.ObjectId(clubId),
      search,
    );
  }
  /*----------------------ACCEPTING OR REJECTING THE REQUEST---------------
   */
  @Post('handle-request')
  async acceptOrRejectRequest(
    @Body()
    requestBody: {
      clubId: string;
      requestId: string;
      status: 'ACCEPTED' | 'REJECTED';
    },
    @Req() req: any,
  ) {
    const { clubId, requestId, status } = requestBody;
    const userId = req.user.id;

    // Convert strings to ObjectIds
    const REQUESTID = new Types.ObjectId(requestId);
    const USERID = new Types.ObjectId(userId);
    const CLUBID = new Types.ObjectId(clubId);

    // returning response
    return await this.clubService.acceptOrRejectRequest(
      REQUESTID,
      USERID,
      CLUBID,
      status,
    );
  }

  /*--------------------LEAVING CLUB API ----------------------------*/
  @Delete('leave-club/:clubId')
  @ApiOperation({ summary: 'Leave a club' })
  @ApiParam({ name: 'clubId', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the status of the user in the club',
    type: ClubMembers,
  })
  async leaveClub(
    @Req() req: Request,
    @Param('clubId') clubId: Types.ObjectId,
  ) {
    const userId = new Types.ObjectId(req.user._id);
    const CLUBID = new Types.ObjectId(clubId);
    return await this.clubService.leaveClub(CLUBID, userId);
  }

  /*----------------------------PINNING CLUB-------------------------- */
  @Put('pin-club/:clubId')
  async pinNode(@Param('clubId') clubId: string, @Req() req: Request) {
    const CLUBID = new Types.ObjectId(clubId);
    const userId = new Types.ObjectId(req.user._id);
    return await this.clubService.pinNode(CLUBID, userId);
  }

  /*----------------------------UNPINNING CLUB-------------------------- */
  @Put('unpin-club/:clubId')
  async unpinNode(@Param('clubId') clubId: string, @Req() req: Request) {
    const CLUBID = new Types.ObjectId(clubId);
    const userId = new Types.ObjectId(req.user._id);
    return await this.clubService.unpinNode(CLUBID, userId);
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
  async getClub(@Param('id') id: Types.ObjectId) {
    const club = await this.clubService.getClubById(id);
    if (!club) {
      throw new NotFoundException('Club not found');
    }
    return club;
  }
}
