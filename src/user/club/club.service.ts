import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateClubDto } from './dto/club.dto';
import { Club } from 'src/shared/entities/club.entity';

@Injectable()
export class ClubService {
  //injecting club schema
  constructor(@InjectModel(Club.name) private clubModel: Model<Club>) {}

  /*
  --------------------CREATING A CLUB----------------------------

  parameter {CreateClubDto} createClubDto - The data to create a new club
  @Returns {Promise<Club>} - The created club 
  */
  async createClub(createClubDto: CreateClubDto): Promise<Club> {
    try {
      console.log({ createClubDto });

      //image uploads
      const profileImageUrl = await this.uploadFile(createClubDto.profileImage);
      const coverImageUrl = await this.uploadFile(createClubDto.coverImage);

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

  private async uploadFile(file: Express.Multer.File): Promise<string> {
    // Implement your file upload logic here
    // This could be uploading to S3, local storage, etc.
    // Return the URL of the uploaded file
    throw new Error('File upload not implemented');
  }
}
