import {
  Controller,
  Get,
  Param,
  UseGuards,
  UseInterceptors,

  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { UserService } from './user.service';

import { UserResponseDto } from './dto/user.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get('fetch-other-profile/:userId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
  })
  async getUserProfile(@Param('userId') userId: string) {
    return await this.userService.findUserById(
      new Types.ObjectId(userId),
    );
  }

  /**
   * Retrieves a user by their username
   * @param term - The username search term
   * @returns Promise containing the matching user data
   */
  @Get('userName')
  async getUserByUserName(@Query('term') term: string) {
    return await this.userService.getUserByUserName(term)
  }

  @Get('search-by-name')
  async getUsersByNameCriteria(@Query('term') term: string) {
    return await this.userService.getUsersByNameCriteria(term)
  }
}
