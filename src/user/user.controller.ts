import {
  Controller,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  Query,
  Search,
  Req,
  Put,
  Body,
  Patch,
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
import { UserWithoutPassword } from './dto/user.type';
import { Request } from 'express';
import { AccessDto } from './dto/access.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get('search')
  async getUsersNotInClubOrNode(
    @Query('type') type: 'node' | 'club',
    @Query('entityId') id: Types.ObjectId,
    @Query('keyword') keyword?: string,
  ): Promise<UserWithoutPassword[]> {
    try {
      return await this.userService.getUsersNotInClubOrNode(keyword, type, id);
    } catch (error) {
      throw error;
    }
  }

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
    return await this.userService.findUserById(new Types.ObjectId(userId));
  }

  /**
   * Retrieves a user by their username
   * @param term - The username search term
   * @returns Promise containing the matching user data
   */
  @Get('username')
  async getUserByUserName(@Query('term') term: string) {
    return await this.userService.getUserByUserName(term);
  }

  @Get('search-by-name')
  async getUsersByNameCriteria(@Query('term') term: string) {
    return await this.userService.getUsersByNameCriteria(term);
  }

  @Get('isUserLoggedIn')
  async isUserLoggedIn(@Req() req: Request) {
    const userId = new Types.ObjectId(req.user._id);
    return await this.userService.isUserLoggedIn(userId);
  }

  // @Get(':search')
  // async getAllUsers(
  //   @Param('search') search: string,
  // ): Promise<UserWithoutPassword[]> {
  //   try {
  //     return await this.userService.getAllUsers(search);
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  //----------------- MAKE ADMIN -------------------------
  @Put('make-admin')
  async makeAdmin(@Req() req: Request, @Body() accessDto: AccessDto) {
    return await this.userService.makeAdmin(accessDto);
  }

  //----------------- MAKE MODERATOR -------------------------
  @Put('make-moderator')
  async makeModerator(@Req() req: Request, @Body() accessDto: AccessDto) {
    return await this.userService.makeModerator(accessDto);
  }

  //----------------- MAKE MEMBER -------------------------
  @Put('make-member')
  async makeMember(@Req() req: Request, @Body() accessDto: AccessDto) {
    return await this.userService.makeMember(accessDto);
  }

  //----------------- REMOVE MEMBER -------------------------
  @Put('remove-member')
  async removeMember(@Req() req: Request, @Body() accessDto: AccessDto) {
    return await this.userService.removeMember(accessDto);
  }

  @Patch('designation')
  async updateDesignation(@Req() req: Request, @Body() { designation, nodeId, memberId }: { designation: string, memberId: string, nodeId: string }) {
    return await this.userService.updateDesignation(req.user._id, memberId, nodeId, designation)
  }
}
