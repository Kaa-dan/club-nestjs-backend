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
} from '@nestjs/common';
import { NodeService } from './node.service';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from 'src/shared/pipes/file-validation.pipe';
import { request } from 'http';
import { User } from 'src/shared/entities/user.entity';

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

  @Put('pin-node/:nodeId')
  pinNode(@Param('nodeId') nodeId: string, @Req() request: Request & { user: User }){
    return this.nodeService.pinNode(nodeId, request.user._id as string)
  }

  @Put('unpin-node/:nodeId')
  unpinNode(@Param('nodeId') nodeId: string, @Req() request: Request & { user: User }){
    return this.nodeService.unpinNode(nodeId, request.user._id as string)
  }
}
