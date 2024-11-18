import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Interest } from '../shared/entities/interest.entity';
import { CreateInterestDto, UpdateInterestDto } from './dto/interest.dto';

@Injectable()
export class InterestService {
  constructor(
    @InjectModel(Interest.name) private interestModel: Model<Interest>,
  ) { }

  /**
   * Get all interests
   * @returns Promise<Interest[]>
   */
  async getAllInterests(): Promise<Interest[]> {
    return this.interestModel.find().exec();
  }

  /**
   * Get interest by ID
   * @param id - Interest ID
   * @returns Promise<Interest>
   */
  async getInterestById(id: string): Promise<Interest> {
    return this.interestModel.findById(id).exec();
  }

  /**
   * Create new interest
   * @param createInterestDto - Interest creation data
   * @returns Promise<Interest>
   */
  async createInterest(
    createInterestDto: CreateInterestDto,
  ): Promise<Interest> {
    const newInterest = new this.interestModel(createInterestDto);
    return newInterest.save();
  }

  /**
   * Update interest by ID
   * @param id - Interest ID
   * @param updateInterestDto - Interest update data
   * @returns Promise<Interest>
   */
  async updateInterest(
    id: string,
    updateInterestDto: UpdateInterestDto,
  ): Promise<Interest> {
    return this.interestModel
      .findByIdAndUpdate(id, updateInterestDto, { new: true })
      .exec();
  }

  /**
   * Delete interest by ID
   * @param id - Interest ID
   * @returns Promise<Interest>
   */
  async deleteInterest(id: string): Promise<Interest> {
    return this.interestModel.findByIdAndDelete(id).exec();
  }
}
