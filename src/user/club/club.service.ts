import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateClubDto, UpdateClubDto } from './dto/club.dto';
import { Club } from 'src/shared/entities/club.entity';
import { UploadService } from 'src/shared/upload/upload.service';

@Injectable()
export class ClubService {
  //injecting club schema
  constructor(
    @InjectModel(Club.name) private clubModel: Model<Club>,
    public readonly s3FileUpload: UploadService,
  ) {}

  /*
  --------------------CREATING A CLUB----------------------------

  parameter {CreateClubDto} createClubDto - The data to create a new club
  @Returns {Promise<Club>} - The created club 
  */
  async createClub(createClubDto: CreateClubDto): Promise<Club> {
    try {
      //image uploads
      const profileImageUrl = await this.uploadFile(createClubDto.profileImage);
      const coverImageUrl = await this.uploadFile(createClubDto.coverImage);
      console.log({ profileImageUrl, coverImageUrl });
      //create club
      const createdClub = new this.clubModel({
        ...createClubDto,
        profileImage: profileImageUrl,
        coverImage: coverImageUrl,
      });

      return await createdClub.save();
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to create club. Please try again later.',
      );
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
