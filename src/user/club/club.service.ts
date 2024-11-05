import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CreateClubDto, UpdateClubDto } from './dto/club.dto';
import { Club } from 'src/shared/entities/club.entity';
import { UploadService } from 'src/shared/upload/upload.service';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';
import { ClubJoinRequests } from 'src/shared/entities/club-join-requests.entity';

@Injectable()
export class ClubService {
  //injecting club schema
  constructor(
    @InjectModel(Club.name) private readonly clubModel: Model<Club>,
    @InjectModel(ClubMembers.name)
    private readonly clubMembersModel: Model<ClubMembers>,
    @InjectModel(ClubJoinRequests.name)
    private readonly clubJoinRequestsModel: Model<ClubJoinRequests>,
    private readonly s3FileUpload: UploadService,
  ) {}

  /*
  --------------------CREATING A CLUB----------------------------

  parameter {CreateClubDto} createClubDto - The data to create a new club
  @Returns {Promise<Club>} - The created club 
  */
  async createClub(createClubDto: CreateClubDto): Promise<Club> {
    // Start a session for the transaction
    const session = await this.clubModel.db.startSession();

    try {
      session.startTransaction();

      // Upload images first - outside transaction since it's  a separate service
      const [profileImageUrl, coverImageUrl] = await Promise.all([
        this.uploadFile(createClubDto.profileImage),
        this.uploadFile(createClubDto.coverImage),
      ]);

      // Create the club document
      const createdClub = new this.clubModel({
        ...createClubDto,
        profileImage: profileImageUrl,
        coverImage: coverImageUrl,
      });

      // Save the club within the transaction
      const clubResponse = await createdClub.save({ session });

      // Create the club member document for admin
      const createClubMember = new this.clubMembersModel({
        club: clubResponse._id,
        user: clubResponse.createdBy,
        role: 'admin',
        status: 'MEMBER',
      });

      // Save the club member within the transaction
      await createClubMember.save({ session });

      // If both operations succeed, commit the transaction
      await session.commitTransaction();
      return clubResponse;
    } catch (error) {
      // If any operation fails, abort the transaction
      await session.abortTransaction();

      console.error('Error creating club:', error);

      if (error instanceof ConflictException) {
        throw error;
      }

      throw new BadRequestException(
        'Failed to create club. Please try again later.',
      );
    } finally {
      // End the session
      await session.endSession();
    }
  }

  /*
  --------------------GETTING ALL CLUBS----------------------------

  @Returns {Promise<Club>} - All clubs
  */
  async getAllClubs(): Promise<Club[]> {
    try {
      return await this.clubModel.find().exec();
    } catch (error) {
      throw new BadRequestException(
        'Failed to fetch clubs. Please try again later.',
      );
    }
  }
  /*
  --------------------GETTING SINGLE CLUB----------------------------

  @Returns {Promise<Club>} - SINGLE CLUB
  */

  async getClubById(id: string): Promise<Club> {
    try {
      const club = await this.clubModel.findById(id).exec();
      if (!club) {
        throw new NotFoundException('Club not found');
      }
      return club;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to fetch club. Please try again later.',
      );
    }
  }
  /*
  --------------------UPDATING ONE CLUB----------------------------

  @Param {string} id - The id of the club to update  @ID to create a new club
  @Returns {Promise<Club>} - The updated  club 
  */
  async updateClub(id: string, updateClubDto: UpdateClubDto): Promise<Club> {
    try {
      const club = await this.clubModel.findById(id).exec();
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      const updateData: any = { ...updateClubDto };

      // Only upload and update images if new files are provided
      if (updateClubDto.profileImage) {
        updateData.profileImage = await this.uploadFile(
          updateClubDto.profileImage,
        );
      }
      if (updateClubDto.coverImage) {
        updateData.coverImage = await this.uploadFile(updateClubDto.coverImage);
      }

      // Remove undefined values
      Object.keys(updateData).forEach(
        (key) => updateData[key] === undefined && delete updateData[key],
      );

      console.log({ updateData });

      const updatedClub = await this.clubModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();

      return updatedClub;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to update club. Please try again later.',
      );
    }
  }
  /*
  --------------------DELETE A CLUB----------------------------

  @Returns {Promise<Club>} - The deleted club 
  */

  async deleteClub(id: string) {
    try {
      const club = await this.clubModel.findById(id).exec();

      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // Delete associated files first
      await this.cleanupFiles(club.profileImage.url, club.coverImage.url);

      // Then delete the club document
      const responce = await this.clubModel.findByIdAndDelete(id).exec();
      return responce;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to delete club. Please try again later.',
      );
    }
  }

  /*
  --------------------GETTING  CLUBS OF THE SPECIFIED USER----------------------------
  @Param {string} id - The id of the user

  @Returns {Promise<Club>} - The deleted club 
  */

  async getAllClubsOfUser(userId: Types.ObjectId) {
    try {
      return await this.clubMembersModel
        .find({ user: userId })
        .populate('club')
        .populate('user')
        .exec();
    } catch (error) {
      console.log(error);
    }
  }

  /*
  --------------------REQUEST  CLUB TO JOIN----------------------------
  @Param USERDATA AND CLUBID

  @Returns {Promise<Club>} - REQUESTED OR JOINED CLUB 
  */

  async requestOrJoinClub(clubId: Types.ObjectId, userId: Types.ObjectId) {
    try {
      // Check if the user is already a member of the club
      const existingClub = await this.clubModel.findOne({
        _id: clubId,
      });

      console.log({ existingClub });

      if (!existingClub) {
        throw new NotFoundException('Club not found');
      }

      //if club is public joining the club
      if (existingClub.isPublic) {
        const responce = await this.clubMembersModel.create({
          club: existingClub._id,
          user: userId,
          role: 'member',
          status: 'MEMBER',
        });
        return responce;
      } else {
        //if club is private this will work
        const responce = await this.clubJoinRequestsModel.create({
          club: existingClub._id,
          user: userId,
          status: 'REQUESTED',
          role: 'member',
        });
        return responce;
      }
    } catch (error) {
      console.log(error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to request to join club. Please try again later.',
      );
    }
  }

  // --------------------------UTIL FUNCTIONS------------------------------
  //handling file uploads
  private async uploadFile(file: Express.Multer.File) {
    try {
      //uploading file
      const response = await this.s3FileUpload.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        'club',
      );
      return response;
    } catch (error) {
      throw new BadRequestException(
        'Failed to upload file. Please try again later.',
      );
    }
  }

  //handling file delete

  private async cleanupFiles(...urls: string[]) {
    try {
      const deletePromises = urls
        .filter((url) => url) // Filter out null/undefined values
        .map((url) => this.s3FileUpload.deleteFile(url));

      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error cleaning up files:', error);
    }
  }
}
