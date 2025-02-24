import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpStatus,
  HttpException,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  Query,
  Get,
  Param,
  Patch,
  InternalServerErrorException,
  Put,
  UploadedFile,
  NotFoundException,
  Delete,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { DebateService } from './debate.service';
import { CreateDebateDto } from './dto/create.dto';
import { Request, Response } from 'express';
import { FileValidationPipe } from 'src/shared/pipes/file-validation.pipe';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Types } from 'mongoose';
import { AdoptDebateDto } from './dto/adopte.dto';
import { DebateArgument } from 'src/shared/entities/debate-argument';
import { Debate } from 'src/shared/entities/debate.entity';

@Controller('debate')
export class DebateController {
  constructor(private readonly debateService: DebateService) { }

  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: memoryStorage(),
    }),
  )
  @Post()
  async createDebate(
    @UploadedFiles(
      new FileValidationPipe({
        files: {
          maxSizeMB: 5,
          allowedMimeTypes: [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
          required: false,
        },
      }),
    )
    files: Express.Multer.File[], // Captures the files

    @Body() createDebateDto: CreateDebateDto, // Captures the body data
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = req.user._id;

    try {
      const dataToSave = {
        ...createDebateDto,
        files,
      };

      // Pass the data to the service for creation
      const result = await this.debateService.createDebate(dataToSave, userId);

      // Return the response
      return res.status(HttpStatus.OK).json({
        message: result.message,
      });
    } catch (error) {
      // Handle errors
      if (error instanceof HttpException) {
        return res.status(error.getStatus()).json({
          statusCode: error.getStatus(),
          error: error.getResponse()['error'],
          message: error.getResponse()['message'],
        });
      }

      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: error.message || 'An unexpected error occurred.',
      });
    }
  }

  @Post('adopt')
  async adoptDebate(@Body() body: AdoptDebateDto, @Req() req: any) {
    try {
      const userId = req?.user?._id; // Extract the authenticated user's ID

      // Validate the provided data
      if (!body.type || !body.debateId) {
        throw new BadRequestException('Type and Debate ID are required fields');
      }

      //   if (body.type === 'club' && !body.clubId) {
      //     throw new BadRequestException('Club ID is required for club adoption');
      //   }

      //   if (body.type === 'node' && !body.nodeId) {
      //     throw new BadRequestException('Node ID is required for node adoption');
      //   }

      // Call the service to process the adoption logic
      const result = await this.debateService.adoptDebate({
        ...body,
        userId: new Types.ObjectId(userId), // Pass the user ID to the service
        debateId: new Types.ObjectId(body.debateId),
        clubId: body.clubId ? new Types.ObjectId(body.clubId) : undefined,
        nodeId: body.nodeId ? new Types.ObjectId(body.nodeId) : undefined,
      });

      return {
        success: true,
        message: result.message,
        data: result.data,
      };
    } catch (error) {
      throw error;
    }
  }
  @Get('my-debates')
  async getMyDebates(
    @Query('entityId') entityId: string,
    @Query('entity') entity: 'node' | 'club',
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Req() req: Request,
  ) {
    const userId = req.user._id;

    const result = await this.debateService.myDebates({
      entity,
      userId,
      entityId,
      page,
      limit
    });

    return result;
  }

  @Get('all-debates')
  async allDebates(
    @Query('entity') entity: 'node' | 'club',
    @Query('entityId') entityId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Req() req: Request,
  ) {
    return await this.debateService.myDebatesByStatus({
      entity,
      entityId,
      page,
      limit
    });
  }
  @Get('ongoing')
  async getOngoingDebates(
    @Query('entityId') entityId: string,
    @Query('entity') entityType: 'club' | 'node',
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    const result = await this.debateService.getOngoingDebatesForEntity({
      entityId,
      entityType,
      page,
      limit,
    });

    return result;
  }

  @Get('global')
  async getOngoingPublicGlobalDebates(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    try {
      return await this.debateService.getOngoingPublicGlobalDebates(
        page,
        limit
      );


    } catch (error) {
      throw new HttpException(
        {
          message: error.message || 'An error occurred while fetching debates.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':debateId/publish')
  async publishDebate(
    @Param('debateId') debateId: string,
    @Body('userId') userId: string,
    @Body('entityId') entityId: string,
    @Body('entityType') entityType: 'node' | 'club',
  ) {
    try {
      const updatedDebate = await this.debateService.publishDebate(
        debateId,
        userId,
        entityId,
        entityType,
      );

      return {
        message: 'Debate published successfully.',
        data: updatedDebate,
      };
    } catch (error) {
      throw error;
    }
  }

  @Put('create-views')
  async createViewsForRulesAndRegulations(
    @Req() req: Request,
    @Body('debateId') rulesId: Types.ObjectId,
  ) {
    try {
      return await this.debateService.createViewsForRulesAndRegulations(
        req.user._id,
        rulesId,
      );
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while liking rules-regulations',
        error,
      );
    }
  }

  @Get('get-clubs-nodes-notadopted/:debateId')
  async getClubsNodesNotAdopted(
    @Req() req: Request,
    @Param('debateId') rulesId: Types.ObjectId,
  ) {
    try {
      return await this.debateService.getNonAdoptedClubsAndNodes(
        req.user._id,
        new Types.ObjectId(rulesId),
      );
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while getting active rules-regulations',
        error,
      );
    }
  }

  @Get('view/:id')
  async viewDebate(@Param('id') id: string) {
    try {
      return this.debateService.getDebateById(id);
    } catch (error) {
      throw error;
    }
  }

  @Get('argument/:debateId')
  async getArgumentsByDebate(@Param('debateId') debateId: string) {
    return this.debateService.getArgumentsByDebate(debateId);
  }

  @UseInterceptors(FilesInterceptor('file', 1, { storage: memoryStorage() }))
  @Post('create-argument')
  async createArgument(
    @Req() req: Request,
    @UploadedFiles(
      new FileValidationPipe({
        file: {
          maxSizeMB: 5,
          allowedMimeTypes: [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
          required: false,
        },
      }),
    )
    file: Express.Multer.File,

    @Body() createDebateArgumentDto,
  ): Promise<DebateArgument> {
    const userId = req.user._id;
    createDebateArgumentDto.userId = userId;
    return this.debateService.createArgument(createDebateArgumentDto, file);
  }

  @Post('vote/:argumentId')
  async toggleVote(
    @Req() req: Request,
    @Param('argumentId') argumentId: string,
    @Body() body: { voteType: 'relevant' | 'irrelevant' },
  ) {
    const { voteType } = body;
    const userId = req.user._id;
    return this.debateService.toggleVote(argumentId, userId, voteType);
  }

  @Get('proposed/:entityId/:entityType/:page')
  async getProposedDebatesByClub(
    @Req() req: Request,
    @Param('entityId') entityId: string,
    @Param('page') page: number,

    @Param('entityType') entityType: 'club' | 'node',
  ) {
    try {
      const userId = req.user._id;
      return await this.debateService.getProposedDebatesByEntityWithAuthorization(
        entityType,
        entityId,
        userId,
        page
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch proposed debates for the club',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  @Put('accept/:debateId/:type')
  async acceptDebate(@Req() req: Request, @Param('debateId') debateId: string, @Param('type') type: string) {
    return this.debateService.acceptDebate(debateId, type, req.user._id);
  }

  @Put('reject/:debateId')
  async rejectDebate(@Param('debateId') debateId: string, @Param('type') type: string, @Req() req: Request) {
    return this.debateService.rejectDebate(debateId, type, req.user._id);
  }

  @Post('check-status')
  async checkParticipationStatus(
    @Req() req: Request,
    @Body()
    body: {
      debateId: string;
      entityType: 'club' | 'node';
      entity: string;
    },
  ): Promise<{ isAllowed: boolean; reason?: string }> {
    const userId = req.user._id;
    const { debateId, entityType, entity } = body;

    // Validate input parameters
    if (!userId || !debateId || !entityType || !entity) {
      throw new BadRequestException(
        'userId, debateId, entityType, and entity are required',
      );
    }

    return this.debateService.validateParticipation(
      userId,
      debateId,
      entityType,
      entity,
    );
  }

  @Post(':parentId/reply')
  async replyToDebateArgument(
    @Req() req: Request,
    @Param('parentId') parentId: string,
    @Body('content') content: string,
  ) {
    const userId = req.user._id;
    return this.debateService.replyToDebateArgument(parentId, content, userId);
  }

  @Get('replies/:parentId')
  async getReplies(@Param('parentId') parentId: string) {
    // Fetch replies using service
    const replies = await this.debateService.getRepliesForParent(parentId);
    if (!replies) {
      throw new NotFoundException(
        `No replies found for DebateArgument with ID ${parentId}`,
      );
    }
    return replies;
  }

  @Post('pin/:id')
  async pin(@Param('id') id: string) {
    try {
      return await this.debateService.pin(id);
    } catch (error) {
      throw error;
    }
  }
  @Post('unpin/:id')
  async unpin(@Param('id') id: string) {
    try {
      return await this.debateService.unpin(id);
    } catch (error) {
      throw error;
    }
  }

  @Delete('argument/:id')
  async deleteArgument(@Param('id') id: string) {
    try {
      return await this.debateService.deleteArgument(id);
    } catch (error) {
      throw error;
    }
  }
}
