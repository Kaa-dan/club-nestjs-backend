import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
  UsePipes,
  Put,
  BadRequestException,
  Req,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { NodeService } from './node.service';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from 'src/shared/pipes/file-validation.pipe';
import { request } from 'http';
import { User } from 'src/shared/entities/user.entity';
import { Types } from 'mongoose';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

@Controller('node')
export class NodeController {
  constructor(private readonly nodeService: NodeService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'profileImage', maxCount: 1 },
      { name: 'coverImage', maxCount: 1 },
    ]),
  )
  @UsePipes(
    new FileValidationPipe({
      profileImage: {
        maxSizeMB: 2,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg'],
        required: true,
      },
      coverImage: {
        maxSizeMB: 2,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg'],
        required: true,
      },
    }),
  )
  create(
    @Body()
    createNodeBody: {
      name: string;
      about: string;
      description: string;
      location: string;
      modules: string[];
    },
    @UploadedFiles()
    files: {
      profileImage?: Express.Multer.File[];
      coverImage?: Express.Multer.File[];
    },
    @Req() request: Request & { user: User },
  ) {
    if (!files.profileImage?.[0] || !files.coverImage?.[0]) {
      throw new BadRequestException(
        'Both profile and cover images are required',
      );
    }

    return this.nodeService.create(
      {
        ...createNodeBody,
        profileImage: files.profileImage[0],
        coverImage: files.coverImage[0],
      },
      request.user._id as string,
    );
  }

  @Get()
  findAll() {
    return this.nodeService.findAll();
  }

  @Get(':nodeId')
  findOne(@Param('nodeId') id: string) {
    return this.nodeService.findOne(id);
  }

  @Post('/request-to-join/:nodeId')
  requestToJoin(
    @Param('nodeId') nodeId: string,
    @Req() request: Request & { user: User },
  ) {
    return this.nodeService.requestToJoin(nodeId, request.user._id as string);
  }

  @Get('/join-requests/:nodeId')
  getAllJoinRequests(@Param('nodeId') nodeId: string) {
    return this.nodeService.getAllJoinRequests(nodeId);
  }

  @Put(`/join-requests/status/:status`)
  updateJoinRequest(
    @Body() { nodeId, userId }: { nodeId: string; userId: string },
    @Param('status') status: 'accept' | 'reject',
    @Req() request: Request & { user: User },
  ) {
    return this.nodeService.updateNodeJoinRequest(nodeId, userId, status);
  }

  @Put(':nodeId')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'profileImage', maxCount: 1 },
      { name: 'coverImage', maxCount: 1 },
    ]),
  )
  @UsePipes(
    new FileValidationPipe({
      profileImage: {
        maxSizeMB: 2,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg'],
        required: true,
      },
      coverImage: {
        maxSizeMB: 2,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg'],
        required: true,
      },
    }),
  )
  update(
    @Param('nodeId') id: string,
    @Body()
    updateNodeBody: {
      name: string;
      about: string;
      description: string;
      location: string;
      modules: string[];
    },
    @UploadedFiles()
    files: {
      profileImage?: Express.Multer.File[];
      coverImage?: Express.Multer.File[];
    },
  ) {
    return this.nodeService.update(id, {
      ...updateNodeBody,
      profileImage: files.profileImage?.[0],
      coverImage: files.coverImage?.[0],
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.nodeService.remove(+id);
  }

  // -----------------------------user status ---------------------------
  @Post('user-status/:clubId')
  @ApiOperation({ summary: 'Get user status for a specific club' })
  @ApiParam({
    name: 'clubId',
    type: 'string',
    description: 'The ID of the club',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'The ID of the user',
        },
      },
      required: ['userId'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the user status for the specified club',
  })
  getUserStatus(
    @Body('userId') userId: string,
    @Param('clubId') clubId: string,
  ) {
    return this.nodeService.getUserStatus(
      new Types.ObjectId(userId),
      new Types.ObjectId(clubId),
    );
  }

  @Put('pin-node/:nodeId')
  async pinNode(
    @Param('nodeId') nodeId: string,
    @Req() request: Request & { user: User },
  ) {
    return await this.nodeService.pinNode(nodeId, request.user._id as string);
  }

  @Put('unpin-node/:nodeId')
  async unpinNode(
    @Param('nodeId') nodeId: string,
    @Req() request: Request & { user: User },
  ) {
    return await this.nodeService.unpinNode(nodeId, request.user._id as string);
  }
}
