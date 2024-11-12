import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
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
  ) {}
  /*---------------GET ALL RULES-REGULATIONS
  
  @Query type:node|club
  @return :RulesRegulations*/
  @Get()
  getAllRulesRegulations(@Query('type') type: 'node' | 'club') {
    try {
      if (!type || (type !== 'node' && type !== 'club')) {
        throw new BadRequestException(
          'Invalid type parameter. Must be "node" or "club".',
        );
      }
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
      if (!createRulesRegulationsDto.node || !createRulesRegulationsDto.club) {
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
}
