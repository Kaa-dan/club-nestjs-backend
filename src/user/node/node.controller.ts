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
import { User } from 'src/shared/entities/user.entity';
import { Types } from 'mongoose';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { SkipAuth } from 'src/decorators/skip-auth.decorator';
import { profile } from 'console';

@Controller('node')
export class NodeController {
  constructor(private readonly nodeService: NodeService) {}

  // -----------------------------CREATE NODE ---------------------------
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
  createNode(
    @Body()
    createNodeBody: {
      name: string;
      about: string;
      description: string;
      location: string;
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


    return this.nodeService.createNode(
      {
        ...createNodeBody,
        profileImage: files.profileImage[0],
        coverImage: files.coverImage[0],
      },
      request.user._id,
    );
  }
  
  // -----------------------------GET ALL NODE ---------------------------
  @SkipAuth()
  @Get()
  async findAllNode() {
    return await this.nodeService.findAllNode();
  }


  // -----------------------------GET ALL NODE OF USER ---------------------------
  @Get('user-nodes')
  async getAllNodesOfUser(@Req() req: Request) {
    const userId = new Types.ObjectId(req.user._id);
    return await this.nodeService.getAllNodesOfUser(userId);
  }

  // -----------------------------REQUEST TO JOIN NODE ---------------------------
  @Post('request-to-join/:nodeId')
  async requestToJoin(
    @Param('nodeId') nodeId: string,
    @Req() request: Request & { user: User },
  ) {
    const userId = new Types.ObjectId(request.user._id);
    return await this.nodeService.requestToJoin(new Types.ObjectId(nodeId), userId);
  }

  // ----------------------------- CANCEL JOIN REQUEST ---------------------------
  @Delete('cancel-join-request/:nodeId')
  async cancelJoinRequest(
    @Param('nodeId') nodeId: string,
    @Req() request: Request & { user: User },
  ) {
    const userId = new Types.ObjectId(request.user._id);
    return await this.nodeService.cancelJoinRequest(new Types.ObjectId(nodeId), userId);
  }

  // -----------------------------GET ALL JOIN REQUESTS OF NODE ---------------------------
  @Get('join-requests/:nodeId')
  getAllJoinRequestsOfNode(@Param('nodeId') nodeId: string) {
    return this.nodeService.getAllJoinRequestsOfNode(new Types.ObjectId(nodeId));
  }

  //-----------------------------GET ALL JOIN REQUESTS OF USER ---------------------------
  @Get('user-join-requests')
  getAllJoinRequestsOfUser(@Req() request: Request) {
    const userId = new Types.ObjectId(request.user._id);
    return this.nodeService.getAllJoinRequestsOfUser(userId);
  }

  // -----------------------------ACCEPT OR REJECT JOIN REQUEST ---------------------------
  @Post('handle-request')
  async acceptOrRejectRequest(
    @Body() 
    requestBody: {
      nodeId: Types.ObjectId; 
      requestId: Types.ObjectId; 
      status: 'ACCEPTED' | 'REJECTED';
    },
    @Req() request: Request & { user: User },
  ) {
    let { nodeId, requestId, status } = requestBody;
    
    const userId = new Types.ObjectId(request.user._id);
    nodeId = new Types.ObjectId(nodeId);
    requestId = new Types.ObjectId(requestId);
    
    return await this.nodeService.acceptOrRejectRequest(nodeId, userId, requestId, status);
  }

  // -----------------------------GET STATUS OF USER OF NODE ---------------------------
  @Get('check-status/:nodeId')
  @ApiOperation({ summary: 'Get user status for a specific node' })
  @ApiParam({
    name: 'nodeId',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the user status for the specified node',
  })
  checkStatus(@Req() req: Request, @Param('nodeId') nodeId: string) {
    const userId = new Types.ObjectId(req.user._id);
    return this.nodeService.checkStatus(
      new Types.ObjectId(userId),
      new Types.ObjectId(nodeId),
    );
  }

  // -----------------------------PIN NODE ---------------------------
  @Put('pin-node/:nodeId')
  async pinNode(
    @Param('nodeId') nodeId: string,
    @Req() request: Request & { user: User },
  ) {
    return await this.nodeService.pinNode(nodeId, request.user._id as string);
  }

  // -----------------------------UNPIN NODE ---------------------------
  @Put('unpin-node/:nodeId')
  async unpinNode(
    @Param('nodeId') nodeId: string,
    @Req() request: Request & { user: User },
  ) {
    return await this.nodeService.unpinNode(nodeId, request.user._id as string);
  }

  // -----------------------------LEAVE NODE ---------------------------
  @Delete('leave-node/:nodeId')
  leaveNode(@Req() req: Request, @Param('nodeId') nodeId: string) {
    const userId = new Types.ObjectId(req.user._id);
    return this.nodeService.leaveNode(new Types.ObjectId(nodeId), userId);
  }

  // -----------------------------GET ONE NODE ---------------------------
  @Get(':nodeId')
  findOne(@Param('nodeId') id: string) {
    return this.nodeService.findOne(id);
  }

  // -----------------------------UPDATE NODE ---------------------------
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
        required: false,
      },
      coverImage: {
        maxSizeMB: 2,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg'],
        required: false,
      },
    }),
  )
  updateNode(
    @Param('nodeId') nodeId: string,
    @UploadedFiles(
      new FileValidationPipe({
        profileImage: {
          maxSizeMB: 5,
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png'],
          required: false,
        },
        coverImage: {
          maxSizeMB: 10,
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png'],
          required: false,
        }
      })
    )
    files: {
      profileImage?: Express.Multer.File[];
      coverImage?: Express.Multer.File[];
    },
    @Body()
    updateNodeBody: {
      name?: string;
      about?: string;
      description?: string;
      location?: string;
    },
  ) {
    return this.nodeService.updateNode(new Types.ObjectId(nodeId), {
      ...updateNodeBody,
      profileImage: files?.profileImage?.[0],
      coverImage: files?.coverImage?.[0],
    });
  }

}
