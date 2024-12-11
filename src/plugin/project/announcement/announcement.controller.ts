import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseInterceptors, BadRequestException, UploadedFile, Query, UploadedFiles } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { ProjectFiles } from 'src/decorators/project-file-upload/project-files.decorator';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FileValidationPipe } from 'src/shared/pipes/file-validation.pipe';
import { Types } from 'mongoose';

@Controller('announcement')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) { }

  @Post()
  @ProjectFiles()
  async create(@Body() createAnnouncementDto: CreateAnnouncementDto, @Req() { user }, @UploadedFiles(
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
  files: {
    file?: Express.Multer.File[];
    bannerImage?: Express.Multer.File[];
  }
  ) {
    console.log(files);

    console.log("nithin raj")
    console.log({ createAnnouncementDto });

    const documentFiles = files.file || []
    return await this.announcementService.create(user._id, createAnnouncementDto, documentFiles);
  }

  @Get("all-project-announcement/:projectID")
  getAllAnnouncementsOfProject(@Req() { user }, @Param('projectID') projectID: Types.ObjectId) {
    return this.announcementService.getAllAnnouncementsOfProject(user._id, projectID);
  }

}
