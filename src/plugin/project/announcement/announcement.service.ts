import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { ProjectAnnouncement } from 'src/shared/entities/projects/project-announcement.entity';
import { Project } from 'src/shared/entities/projects/project.entity';
import { UploadService } from 'src/shared/upload/upload.service';

@Injectable()
export class AnnouncementService {
  constructor(@InjectModel(ProjectAnnouncement.name) private readonly projectAnnouncementModel: Model<ProjectAnnouncement>, @InjectModel(Project.name) private readonly projectModel: Model<Project>, private readonly s3FileUpload: UploadService) { }



  /**
   * 
   * @param userId 
   * @param createAnnouncementDto 
   * @returns 
   */
  async create(userId: Types.ObjectId, createAnnouncementDto: CreateAnnouncementDto, documentFiles: Express.Multer.File[],) {


    //checking if the user is the creator
    const isCreator = await this.projectModel.findOne({ _id: new Types.ObjectId(createAnnouncementDto.projectId), createdBy: userId }, { createdBy: 1, _id: 0 });

    const uploadedDocumentFiles = await Promise.all(documentFiles.map(file => this.uploadFile(file)))

    // Create file objects with metadata
    const fileObjects = uploadedDocumentFiles.map((file, index) => ({
      url: file.url,
      originalname: documentFiles[index].originalname,
      mimetype: documentFiles[index].mimetype,
      size: documentFiles[index].size,
    }));


    //throwing error if user is not the creator
    if (!isCreator) {
      throw new UnauthorizedException('you are not the creator of this club')
    }
    //creating announcement
    const createdAnnouncement = await this.projectAnnouncementModel.create({ announcement: createAnnouncementDto.announcement, project: new Types.ObjectId(createAnnouncementDto.projectId), files: fileObjects })


    return { createdAnnouncement, success: true, message: "announcement created successfully" };
  }


  findAll() {
    return `This action returns all announcement`;
  }

  findOne(id: number) {
    return `This action returns a #${id} announcement`;
  }

  update(id: number, updateAnnouncementDto: UpdateAnnouncementDto) {
    return `This action updates a #${id} announcement`;
  }

  remove(id: number) {
    return `This action removes a #${id} announcement`;
  }

  private async uploadFile(file: Express.Multer.File) {
    try {
      const response = await this.s3FileUpload.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        'club',
      );
      return response;
    } catch (error) {
      throw new BadRequestException(
        'Failed to upload file. Please try again later.',
      );
    }
  }


}
