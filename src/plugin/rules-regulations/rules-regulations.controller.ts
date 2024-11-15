import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { RulesRegulationsService } from './rules-regulations.service';
import { CreateRulesRegulationsDto } from './dto/rules-regulation.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { FileValidationPipe } from 'src/shared/pipes/file-validation.pipe';
import { memoryStorage } from 'multer';
import { Types } from 'mongoose';
import { CommentService } from 'src/user/comment/comment.service';

export interface IFileObject {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}
@Controller('rules-regulations')
export class RulesRegulationsController {
  //@inject
  constructor(
    private readonly rulesRegulationsService: RulesRegulationsService,
    private readonly commentService: CommentService,
  ) {}
  /*---------------GET ALL RULES-REGULATIONS
  
  @Query type:node|club
  @return :RulesRegulations*/
  @Get()
  getAllRulesRegulations(@Query('type') type: 'node' | 'club' | 'all') {
    try {
      // if (!type || (type !== 'node' && type !== 'club')) {
      //   throw new BadRequestException(
      //     'Invalid type parameter. Must be "node" or "club".',
      //   );
      // }
      return this.rulesRegulationsService.getAllRulesRegulations(type);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error while fetching rules and regulations',
        error,
      );
    }
  }

  /* -----------------------------CREATE RULES AND REGULATIONS
  
  @Param :createRulesRegulationsDto
  @Res :RulesRegulations
  @description :Create a new rules-regulations
  @Req:user_id */

  @UseInterceptors(
    FilesInterceptor('file', 5, {
      storage: memoryStorage(),
    }),
  )
  @Post()
  async createRulesRegulations(
    @Req() req: Request,
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
          required: true,
        },
      }),
    )
    files: Express.Multer.File[],
    @Body() createRulesRegulationsDto: CreateRulesRegulationsDto,
  ) {
    try {
      console.log({
        createRulesRegulationsDto,
      });
      console.log('nihtin');
      if (!createRulesRegulationsDto.node && !createRulesRegulationsDto.club) {
        throw new BadRequestException(
          'Invalid type parameter. Must be "node" or "club".',
        );
      }

      // Validate number of file
      if (files.length > 5) {
        throw new BadRequestException('Must provide between 1 and 5 file');
      }

      if (createRulesRegulationsDto.publishedStatus === 'draft') {
        //saving all the detail to sent to the service
        const dataToSave = {
          ...createRulesRegulationsDto,
          createdBy: req['user']._id,
          isActive: false,
          files,
        };

        return await this.rulesRegulationsService.createRulesRegulations(
          dataToSave,
        );
      } else {
        const dataToSave = {
          ...createRulesRegulationsDto,
          createdBy: req['user']._id,
          publishedBy: req['user']._id,
          publishedDate: new Date(),
          isActive: true,
          version: 1,
          files,
        };

        return await this.rulesRegulationsService.createRulesRegulations(
          dataToSave,
        );
      }
    } catch (error) {
      console.log('error', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error while creating rules-regulations',
        error,
      );
    }
  }

  /* ----------------------------------UPDATING RULES AND REGULATIONS
  @Param :updateRulesRegulationDto
  @Res:RulesRegulations
  @Description :Update rules-regulations
  @Req:user_id*/

  @UseInterceptors(
    FilesInterceptor('file', 5, {
      storage: memoryStorage(),
    }),
  )
  @Put()
  async updateRulesRegulations(
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
          required: true,
        },
      }),
    )
    file: Express.Multer.File[],
    @Body() updateRulesRegulationsDto,
  ) {
    try {
      if (file.length > 5 - updateRulesRegulationsDto.files.length) {
        throw new BadRequestException('maximum count of files should be 5');
      }

      // Process the file and create file paths array
      const fileObjects = file.map((singleFile) => ({
        buffer: singleFile.buffer,
        originalname: singleFile.originalname,
        mimetype: singleFile.mimetype,
        size: singleFile.size,
      }));

      //saving all the detail to sent to the service
      const dataToSave = {
        ...updateRulesRegulationsDto,
        updatedBy: req['user']._id,
        updatedDate: new Date(),
      };

      return await this.rulesRegulationsService.updateRulesRegulations(
        dataToSave,
        req.user._id,
        fileObjects,
      );
    } catch (error) {
      console.log('error', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error while creating rules-regulations',
        error,
      );
    }
  }

  /*--------------------------------GET ALL RULES AND REGULATION OF SINGLE CLUB OR NODE 
  @Query : type = club|node 
  @Query : from = club|node id
  @Req   : req.user 
  */
  @Get('get-all-active-rules')
  async getAllActiveRulesRegulations(
    @Query('from') forId: Types.ObjectId,
    @Query('type') type: string,
    @Req() req: Request,
  ) {
    try {
      const ID = new Types.ObjectId(forId);
      return await this.rulesRegulationsService.getAllActiveRulesRegulations(
        type,
        ID,
      );
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while getting active rules-regulations',
        error,
      );
    }
  }
  /*-------------------GET MY RULES
   @Req:user_id
   @eturn:RulesRegulations */
  @Get('get-my-rules')
  async getMyRules(@Req() req: Request) {
    try {
      return await this.rulesRegulationsService.getMyRules(req.user._id);
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while getting active rules-regulations',
        error,
      );
    }
  }

  /*--------------------------ADOPT RULES 
  @Body:rulesId,clubId,nodeId,type
  @Req:user_id
  @return:RulesRegulations
   */

  @Post('adopt-rules')
  async adoptRules(
    @Body('rulesId') rulesId: Types.ObjectId,
    @Body('clubId') clubId: Types.ObjectId,
    @Body('nodeId') nodeId: Types.ObjectId,
    @Body('type') type: 'club' | 'node',
    @Req() req: Request,
  ) {
    try {
      const data = {
        type,
        rulesId,
        clubId,
        nodeId,
        userId: req.user._id,
      };
      console.log(data);

      return await this.rulesRegulationsService.adoptRules(data);
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        'Error while adopting rules-regulations',
        error,
      );
    }
  }
  /*--------------------------GET NOT ADOPTED NODE OR CLUBS */
  @Get('get-clubs-nodes-notadopted/:rulesId')
  async getClubsNodesNotAdopted(
    @Req() req: Request,
    @Param('rulesId') rulesId: Types.ObjectId,
  ) {
    try {
      return await this.rulesRegulationsService.getClubsNodesNotAdopted(
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
  /*-------------GET SINGLE RULES DETAILS
   */
  @Get('get-rules/:ruleId')
  async getRules(@Param('ruleId') ruleId: Types.ObjectId) {
    try {
      return await this.rulesRegulationsService.getRules(ruleId);
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while getting active rules-regulations',
        error,
      );
    }
  }

  //----------LIKE RULES AND REGULATIONS

  @Put('like-rules')
  async likeRulesRegulations(
    @Body('rulesId') rulesId: Types.ObjectId,

    @Req() req: Request,
  ) {
    try {
      return await this.rulesRegulationsService.likeRulesRegulations(
        req.user._id,
        rulesId,
      );
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException(
        'Error while liking rules-regulations',
        error,
      );
    }
  }

  //------------------UNLIKE RULES AND REGULATIONS
  @Put('unlike-rules')
  async unlikeRulesRegulations(
    @Body('rulesId') rulesId: Types.ObjectId,

    @Req() req: Request,
  ) {
    try {
      return await this.rulesRegulationsService.unlikeRulesRegulations(
        req.user._id,
        rulesId,
      );
    } catch (error) {
      console.log({ error });

      throw new InternalServerErrorException(
        'Error while liking rules-regulations',
        error,
      );
    }
  }

  //-------------------------SOFT DELETE RULES AND REGULATIONS
  @Put('delete-rules')
  async softDeleteRulesRegulations(
    @Query('rulesId') rulesId: Types.ObjectId,

    @Req() req: Request,
  ) {
    try {
      return await this.rulesRegulationsService.softDeleteRulesRegulations(
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

  //-----------------------------REPORT OFFENSE
  @UseInterceptors(
    FilesInterceptor('file', 1, {
      storage: memoryStorage(),
    }),
  )
  @Post('reportOffence')
  async reportOffence(
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
          required: true,
        },
      }),
    )
    file: Express.Multer.File,
    @Body()
    reportData: {
      type: string;
      typeId: Types.ObjectId;
      reason: string;
      rulesID: Types.ObjectId;
      offenderID: Types.ObjectId;
    },
    @Req() req: Request,
  ) {
    try {
      // Process the file and create file paths array
      // const fileObjects: IFileObject[] = file.map((singleFile) => ({
      //   buffer: singleFile.buffer,
      //   originalname: singleFile.originalname,
      //   mimetype: singleFile.mimetype,
      //   size: singleFile.size,
      // }));

      console.log(file, 'file');
      return await this.rulesRegulationsService.reportOffense(
        req.user._id,
        reportData,
        file[0],
      );
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Error while report offense rules-regulations',
        error,
      );
    }
  }
  //-----------------------------GET ALL REPORTS
  @Get('get-all-report-offence')
  async getAllOffence(
    @Query('type') type: 'node' | 'club',
    @Query('clubId') clubId: Types.ObjectId,
  ) {
    try {
      return this.rulesRegulationsService.getAllReportOffence(clubId, type);
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while liking rules-regulations',
        error,
      );
    }
  }

  /* -------------CRATE VIEWS FOR THE RULES AND REGULATIONS */
  @Put('create-views')
  async createViewsForRulesAndRegulations(
    @Req() req: Request,
    @Body('rulesId') rulesId: Types.ObjectId,
  ) {
    try {
      console.log({ rulesId });
      return await this.rulesRegulationsService.createViewsForRulesAndRegulations(
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
  /**
   * Retrieves all comments for a specific rule
   * @param ruleId - The ObjectId of the rule to get comments for
   * @returns Promise containing comments for the specified rule
   */
  @Get(':ruleId/comments')
  getAllComments(@Param('ruleId') ruleId: Types.ObjectId) {
    return this.commentService.getCommentsByEntity('RulesRegulations', ruleId);
  }

  /**
   * Creates a new comment for a rules and regulations entry
   * @param req - Express request object containing user information
   * @param file - Array containing a single uploaded file (image, PDF or document)
   * @param createCommentData - Comment data to be created
   * @returns Promise containing the created comment
   */
  @UseInterceptors(FilesInterceptor('file', 1, { storage: memoryStorage() }))
  @Post('comment')
  async createComment(
    @Req() req,
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
        },
      }),
    )
    file: Express.Multer.File[],
    @Body() createCommentData: any,
  ) {
    createCommentData.entityType = 'RulesRegulations';
    const userId = new Types.ObjectId(req.user._id);
    return await this.commentService.createComment(
      createCommentData,
      userId,
      file[0],
    );
  }

  /**
   * Adds a like to a comment on rules and regulations
   * @param req - Express request object containing user information
   * @param commentId - ID of the comment to like
   * @returns Promise containing the updated comment with the new like
   */
  @Put('comment/:id/like')
  async likeComment(@Req() req, @Param('id') commentId: string) {
    const userId = new Types.ObjectId(req.user._id);
    return await this.commentService.likeComment(
      new Types.ObjectId(commentId),
      userId,
    );
  }

  /**
   * Adds a dislike to a comment on rules and regulations
   * @param req - Express request object containing user information
   * @param commentId - ID of the comment to dislike
   * @returns Promise containing the updated comment with the new dislike
   */
  @Put('comment/:id/dislike')
  async dislikeComment(@Req() req, @Param('id') commentId: string) {
    const userId = new Types.ObjectId(req.user._id);
    return await this.commentService.dislikeComment(
      new Types.ObjectId(commentId),
      userId,
    );
  }

  /**
   * Deletes a comment from rules and regulations
   * @param req - Express request object
   * @param commentId - ID of the comment to delete
   * @returns Promise containing the result of comment deletion
   */
  @Put('comment/:id/delete')
  async deleteComment(@Req() req, @Param('id') commentId: string) {
    return await this.commentService.deleteComment(
      new Types.ObjectId(commentId),
    );
  }
}
