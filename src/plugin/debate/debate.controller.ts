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
} from '@nestjs/common';
import { DebateService } from './debate.service';
import { CreateDebateDto } from './dto/create.dto';
import { Request, Response } from 'express';
import { FileValidationPipe } from 'src/shared/pipes/file-validation.pipe';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Types } from 'mongoose';
import { AdoptDebateDto } from './dto/adopte.dto';

@Controller('debate')
export class DebateController {
  constructor(private readonly debateService: DebateService) {}

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
    console.log(createDebateDto); // To check if the body data is properly captured

    try {
      const dataToSave = {
        ...createDebateDto,
        files,
      };
      console.log({ files });

      // Pass the data to the service for creation
      const result = await this.debateService.createDebate(dataToSave, userId);

      // Return the response
      return res.status(HttpStatus.OK).json({
        message: result.message,
        data: result.data,
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
    console.log({ body });

    try {
      const userId = req.user._id; // Extract the authenticated user's ID
      console.log({ userId });

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
      console.error('Adopt Debate Controller Error:', error);
      throw error;
    }
  }

  @Get('my-debates')
  async getMyDebates(
    @Query('entityId') entityId: string, // Optional Club ID to filter by (if provided)
    @Query('entity') entity: 'node' | 'club',
    @Req() req: Request,
  ) {
    const userId = req.user._id;
    // Validate that userId is provided
    if (!userId) {
      throw new BadRequestException('User ID is required.');
    }

    try {
      // Call the myDebates method from the service
      const result = await this.debateService.myDebates({
        entity,

        userId,
        entityId,
      });
      console.log({ result });

      // Return the result to the client
      return result;
    } catch (error) {
      // Handle and rethrow error appropriately (it's already handled in the service)
      throw error;
    }
  }

  @Get('all-debates')
  async allDebates(
    @Query('entity') entity: 'node' | 'club',
    @Query('entityId') entityId: string,
    @Req() req: Request,
  ) {
    try {
      return await this.debateService.myDebatesByStatus({
        entity,

        entityId,
      });
    } catch (error) {
      throw error;
    }
  }
  @Get('ongoing')
  async getOngoingDebates(
    @Query('entityId') entityId: string,
    @Query('entity') entityType: 'club' | 'node',
  ) {
    console.log({ entityId, entityType });

    try {
      if (!entityId || !entityType) {
        throw new BadRequestException(
          'Both entityId and entityType are required.',
        );
      }

      // Call the service to get ongoing debates for the given entity (club or node)
      const result = await this.debateService.getOngoingDebatesForEntity({
        entityId,
        entityType,
      });

      // Return the result from the service
      return result;
    } catch (error) {
      console.error('Error fetching ongoing debates:', error);
      throw error;
    }
  }

  @Get('global')
  async getOngoingPublicGlobalDebates() {
    try {
      const ongoingDebates =
        await this.debateService.getOngoingPublicGlobalDebates();
      return {
        message: 'Ongoing public global debates fetched successfully',
        data: ongoingDebates,
      };
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
      console.error('Error publishing debate:', error);
      throw error;
    }
  }

  @Put('create-views')
  async createViewsForRulesAndRegulations(
    @Req() req: Request,
    @Body('rulesId') rulesId: Types.ObjectId,
  ) {
    try {
      console.log({ rulesId });
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
      console.log('errrrr ', error);
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
}
