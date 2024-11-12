import {
  BadRequestException,
  Body,
  Controller,
  FileTypeValidator,
  Get,
  InternalServerErrorException,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { RulesRegulationsService } from './rules-regulations.service';
import { CreateRulesRegulationsDto } from './dto/rules-regulation.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { FileValidationPipe } from 'src/shared/pipes/file-validation.pipe';
import { diskStorage, memoryStorage } from 'multer';
import { extname } from 'path';
import { from } from 'rxjs';
import { Types } from 'mongoose';

@Controller('rules-regulations')
export class RulesRegulationsController {
  //@inject
  constructor(
    private readonly rulesRegulationsService: RulesRegulationsService,
  ) { }
  /*---------------GET ALL RULES-REGULATIONS
  
  @Param :createRulesRegulationsDto
  @return :RulesRegulations*/
  @Get('get-all-rules-regulations')
  getAllRulesRegulations() {
    return 'All rules-regulations';
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
  @Post('create-rules-regulations')
  async createRulesRegulations(
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
    @Body() createRulesRegulationsDto,
  ) {
    try {
      console.log('nithin');
      // Validate number of file
      if (!file || file.length < 1 || file.length > 10) {
        throw new BadRequestException('Must provide between 1 and 10 file');
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
        ...createRulesRegulationsDto,
        file: fileObjects,
        createdBy: req['user']._id,
        publishedBy: req['user']._id,
        publishedDate: new Date(),
        version: 1,
        isActive: true,
      };

      return await this.rulesRegulationsService.createRulesRegulations(
        dataToSave,
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

  /* ----------------------------------UPDATING RULES AND REGULATIONS
  @Param :updateRulesRegulationDto
  @Res:RulesRegulations
  @Description :Update rules-regulations
  @Req:user_id*/

  @UseInterceptors(
    FilesInterceptor('file', 10, {
      storage: memoryStorage(),
    }),
  )
  @Put('update-rules-regulations')
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
      // Validate number of file
      if (!file || file.length < 1 || file.length > 5) {
        throw new BadRequestException('Must provide between 1 and 10 file');
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
        file: fileObjects,
        updatedBy: req['user']._id,
        updatedDate: new Date(),
      };

      return await this.rulesRegulationsService.updateRulesRegulations(
        dataToSave,
        req.user._id,
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
  @Get('get-all-active-rules-regulations')
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

  /*------------------------------------SAVE RULES AND REGULATION TO DRAFT
   */
  @Put('save-rules-regulations-to-draft')
  async saveRulesRegulationsToDraft(@Req() req: Request, @Body() draftData) {
    try {
      return await this.rulesRegulationsService.saveRulesRegulationsToDraft(
        draftData,
        req.user._id,
      );
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while getting active rules-regulations',
        error,
      );
    }
  }
}
