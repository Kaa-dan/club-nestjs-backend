import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  UseInterceptors,
  Req,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-update-project.dto';
import { memoryStorage } from 'multer';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from 'src/shared/pipes/file-validation.pipe';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiResponse,
} from '@nestjs/swagger';

/**
 * Controller handling all project-related operations
 * Includes functionality for creating, reading, updating and managing projects
 */
@ApiTags('Projects')
@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  /**
   * Creates a new project with provided details and files
   * @param req - Express request object containing user info
   * @param createProjectDto - DTO containing project details
   * @param files - Object containing project files and banner image
   * @returns Newly created project
   * @throws BadRequestException if file type is invalid
   */
  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'The project has been successfully created.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or file type.',
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 5 },
        { name: 'bannerImage', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        fileFilter: (req, file, cb) => {
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
      },
    ),
  )
  create(
    @Req() req: Request,
    @Body(ValidationPipe) createProjectDto: CreateProjectDto,
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
    files: {
      file?: Express.Multer.File[];
      bannerImage?: Express.Multer.File[];
    },
  ) {
    console.log('DEBUGGING...........................');
    const documentFiles = files.file || [];
    const bannerImage = files.bannerImage?.[0] || null;
    return this.projectService.create(
      createProjectDto,
      req.user._id,
      documentFiles,
      bannerImage,
    );
  }
}
