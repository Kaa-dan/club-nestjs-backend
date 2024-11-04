import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateClubDto } from './dto/interest.dto';
import { Club, ClubDocument } from 'src/shared/entities/club.entity';

@Injectable()
export class ClubService {
  constructor(@InjectModel(Club.name) private clubModel: Model<ClubDocument>) {}

  async createClub(createClubDto: CreateClubDto): Promise<Club> {
    try {
      const createdClub = new this.clubModel(createClubDto);
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
}
