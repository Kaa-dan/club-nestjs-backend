import { Body, Controller, Post, HttpStatus } from '@nestjs/common';

import { ClubService } from './club.service';

import { Club } from 'src/shared/entities/club.entity';

import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CreateClubDto } from './dto/interest.dto';

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
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The club has been successfully created.',
    type: Club,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  async createClub(@Body() createClubDto: CreateClubDto) {
    return await this.clubService.createClub(createClubDto);
  }
}
