import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { InterestService } from './interest.service';
import { CreateInterestDto, UpdateInterestDto } from './dto/interest.dto';
import { Interest } from '../shared/entities/interest.entity';

@Controller('interest')
export class InterestController {
  constructor(private readonly interestService: InterestService) {}

  /**
   * Get all interests
   * @returns Promise<Interest[]>
   */
  @Get()
  async getAllInterests(): Promise<Interest[]> {
    try {
      return await this.interestService.getAllInterests();
    } catch (error) {
      throw new BadRequestException('Failed to fetch interests');
    }
  }

  /**
   * Get interest by ID
   * @param id - Interest ID
   * @returns Promise<Interest>
   */
  @Get(':id')
  async getInterestById(@Param('id') id: string): Promise<Interest> {
    try {
      const interest = await this.interestService.getInterestById(id);
      if (!interest) {
        throw new NotFoundException('Interest not found');
      }
      return interest;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch interest');
    }
  }

  /**
   * Create new interest
   * @param createInterestDto - Interest creation data
   * @returns Promise<Interest>
   */
  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  async createInterest(
    @Body() createInterestDto: CreateInterestDto,
  ): Promise<Interest> {
    try {
      return await this.interestService.createInterest(createInterestDto);
    } catch (error) {
      if (error.code === 11000) {
        // MongoDB duplicate key error
        throw new BadRequestException(
          'Interest with this title already exists',
        );
      }
      throw new BadRequestException('Failed to create interest');
    }
  }

  /**
   * Update interest by ID
   * @param id - Interest ID
   * @param updateInterestDto - Interest update data
   * @returns Promise<Interest>
   */
  @Put(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateInterest(
    @Param('id') id: string,
    @Body() updateInterestDto: UpdateInterestDto,
  ): Promise<Interest> {
    try {
      const updatedInterest = await this.interestService.updateInterest(
        id,
        updateInterestDto,
      );
      if (!updatedInterest) {
        throw new NotFoundException('Interest not found');
      }
      return updatedInterest;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.code === 11000) {
        throw new BadRequestException(
          'Interest with this title already exists',
        );
      }
      throw new BadRequestException('Failed to update interest');
    }
  }

  /**
   * Delete interest by ID
   * @param id - Interest ID
   * @returns Promise<void>
   */
  @Delete(':id')
  async deleteInterest(@Param('id') id: string): Promise<void> {
    try {
      const result = await this.interestService.deleteInterest(id);
      if (!result) {
        throw new NotFoundException('Interest not found');
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete interest');
    }
  }
}
