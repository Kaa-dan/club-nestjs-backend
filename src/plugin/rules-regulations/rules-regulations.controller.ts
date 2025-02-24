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
  Search,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { RulesRegulationsService } from './rules-regulations.service';
import { CreateRulesRegulationsDto } from './dto/rules-regulation.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { FileValidationPipe } from 'src/shared/pipes/file-validation.pipe';
import { memoryStorage } from 'multer';
import { Types } from 'mongoose';
import { CommentService } from 'src/user/comment/comment.service';

import { RulesRegulations } from 'src/shared/entities/rules-regulations.entity';
import { all } from 'axios';

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
  ) { }
  /*---------------GET ALL RULES-REGULATIONS
  
  @Query type:node|club
  @return :RulesRegulations*/
  @Get()
  async getAllRulesRegulations(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string
  ) {
    try {

      const pageNumber = parseInt(page as any) || 1;
      const limitNumber = parseInt(limit as any) || 10;

      return await this.rulesRegulationsService.getAllRulesRegulations(
        pageNumber,
        limitNumber,
        search
      );
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
          required: false,
        },
      }),
    )
    files: Express.Multer.File[],
    @Body() createRulesRegulationsDto: CreateRulesRegulationsDto,
  ) {
    try {
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

        throw new BadRequestException('cannot save to draft')
      }

      // saving all the detail to sent to the service
      const dataToSave = {
        ...createRulesRegulationsDto,
        createdBy: req.user._id,
        version: 1,
        files,
      };

      return await this.rulesRegulationsService.createRulesRegulations(
        dataToSave, req.user._id
      );

    } catch (error) {

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error while creating rules-regulations',
        error,
      );
    }
  }

  /*------------------------------SAVE TO DRAFT RULES AND REGULATIONS 
  @Param :createRulesRegulationsDto
  @Res :RulesRegulations
  @description :Create a new rules-regulations
  @Req:user_id 

  */

  @UseInterceptors(
    FilesInterceptor('file', 5, {
      storage: memoryStorage(),
    }),
  )
  @Post('draft')
  async saveToDraft(
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
    @Body() createRulesRegulationsDto,
  ) {
    try {

      console.log({ createRulesRegulationsDto })
      if (!createRulesRegulationsDto.node && !createRulesRegulationsDto.club) {
        throw new BadRequestException(
          'Invalid type parameter. Must be "node" or "club".',
        );
      }

      // Validate number of file
      if (files.length > 5) {
        throw new BadRequestException('Must provide between 1 and 5 file');
      }

      if (createRulesRegulationsDto.publishedStatus !== 'draft') {
        throw new BadRequestException('error while saving to draft please try again ')
      }
      //saving all the detail to sent to the service
      const dataToSave = {
        ...createRulesRegulationsDto,
        createdBy: req['user']._id,
        isPublic: false,
        isActive: false,
        version: 1,
        files,
        publishedStatus: 'draft',
      };
      console.log({ dataToSave })

      return await this.rulesRegulationsService.saveToDraft(
        dataToSave
      );

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error while creating rules-regulations',
        error,
      );
    }
  }



  @Put('accept-proposed-rules')
  async acceptProposedRulesAndRegulations(@Req() { user }, @Query('rulesId') rulesId: Types.ObjectId, @Query('entityId') enitityId: Types.ObjectId, @Query(';type') type: "node" | "club") {
    return this.rulesRegulationsService.acceptProposedRulesAndRegulations(user._id, rulesId, enitityId, type)
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
          required: false, // Allow empty or no files
        },
      }),
    )
    file: Express.Multer.File[],
    @Body() updateRulesRegulationsDto,
  ) {
    try {
      // Initialize fileObjects array
      const fileObjects = file
        ? file.map((singleFile) => ({
          buffer: singleFile.buffer,
          originalname: singleFile.originalname,
          mimetype: singleFile.mimetype,
          size: singleFile.size,
        }))
        : [];

      // Validate the total file count if `files` exist in DTO
      if (
        file &&
        updateRulesRegulationsDto?.files &&
        file.length > 5 - updateRulesRegulationsDto.files.length
      ) {
        throw new BadRequestException('Maximum count of files should be 5');
      }

      // Prepare data to save
      const dataToSave = {
        ...updateRulesRegulationsDto,
        updatedBy: req['user']?._id,
        updatedDate: new Date(),
      };

      // Call the service with data and file objects
      return await this.rulesRegulationsService.updateRulesRegulations(
        dataToSave,
        req['user']?._id,
        fileObjects,
      );
    } catch (error) {
      console.error('Error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error while updating rules-regulations',
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
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string,
    @Req() req: Request,
  ) {
    try {
      const ID = new Types.ObjectId(forId);
      // Convert string to number since query params come as strings
      const pageNumber = parseInt(page as any) || 1;
      const limitNumber = parseInt(limit as any) || 10;

      return await this.rulesRegulationsService.getAllActiveRulesRegulations(
        type,
        ID,
        pageNumber,
        limitNumber,
        search
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
  async getMyRules(
    @Req() req: Request,
    @Query('entity') entity: Types.ObjectId,
    @Query('type') type: 'node' | 'club',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string
  ) {
    try {
      console.log("consolingsearch from controller", search)

      const pageNumber = parseInt(page as any) || 1;
      const limitNumber = parseInt(limit as any) || 10;


      return await this.rulesRegulationsService.getMyRules(
        req.user._id,
        type,
        entity,
        pageNumber,
        limitNumber,
        search
      );
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


      return await this.rulesRegulationsService.adoptRules(data);
    } catch (error) {

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

      return await this.rulesRegulationsService.reportOffense(
        req.user._id,
        reportData,
        file[0],
      );
    } catch (error) {
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
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    try {
      return await this.rulesRegulationsService.getAllReportOffence(
        clubId,
        type,
        Number(page),
        Number(limit)
      );
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while getting rules-regulations',
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
    return this.commentService.getCommentsByEntity(
      RulesRegulations.name,
      ruleId,
    );
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
    createCommentData.entityType = RulesRegulations.name;
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

  /**
   * Propose rules for the club
   * @param req - Express request object
   * @param commentId - ID of the comment to delete
   * @returns Promise containing the result of comment deletion
   */

  @Put('propose-rule')
  async proposeRules(@Req() req: Request, @Body() data) {
    const userId = req.user._id;
    return await this.rulesRegulationsService.proposeRules(userId, data);
  }

  /**
   * Get all the clubs and node of the user with role of the user
   * @param req - Express request object
   * @returns Promise containing the result of the data
   */

  @Get('get-all-clubs-nodes-role')
  async getAllClubsAndNodesWithRole(@Req() req: Request) {
    return this.rulesRegulationsService.getAllClubsAndNodesWithRole(
      req.user._id,
    );
  }

  @Get('chapter-all-club-rules')
  async getChapterAllClubRules(@Req() req: Request, @Query('chapter') chapterId: string) {
    return this.rulesRegulationsService.getChapterAllClubRules(chapterId);
  }
}
