import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseInterceptors, BadRequestException, UploadedFile, Query } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { ProjectFiles } from 'src/decorators/project-file-upload/project-files.decorator';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Types } from 'mongoose';

@Controller('announcement')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) { }

  @Post()
  @ProjectFiles()
  @UseInterceptors(FileFieldsInterceptor([{ name: 'file', maxCount: 5 }], {
    storage: memoryStorage(),
    fileFilter: (req, file, cb) => {
      // Define allowed file types for upload
      const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Invalid file type'), false);
      }
    },
  },))
  create(@Body() createAnnouncementDto: CreateAnnouncementDto, @Req() { user }, files: {
    file?: Express.Multer.File[];
  },) {

    const documentFiles = files.file || []
    return this.announcementService.create(user._id, createAnnouncementDto, documentFiles);
  }

  @Get("all-project-announcement/:projectID")
  getAllAnnouncementsOfProject(@Req() { user }, @Param('projectID') projectID: Types.ObjectId) {
    return this.announcementService.getAllAnnouncementsOfProject(user._id, projectID);
  }

}
