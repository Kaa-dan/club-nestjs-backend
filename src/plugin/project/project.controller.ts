import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  UseInterceptors,
  Req,
  UploadedFiles,
  BadRequestException,
  Put,
  Param,
  Get,
  DefaultValuePipe,
  ParseIntPipe,
  Query,
  ParseBoolPipe,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
} from './dto/create-update-project.dto';
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
import { ProjectFiles } from 'src/decorators/project-file-upload/project-files.decorator';
import { Types } from 'mongoose';
import { Query as NestQuery } from '@nestjs/common';

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
  @ProjectFiles()
  async create(
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
    // Extract files from request
    const documentFiles = files.file || [];
    const bannerImage = files.bannerImage?.[0] || null;
    return await this.projectService.create(
      createProjectDto,
      req.user._id,
      documentFiles,
      bannerImage,
    );
  }

  /**
   * Saves a project as draft with all provided details and files
   * @param req - Express request object containing user info
   * @param updateProjectDto - DTO containing project updates
   * @param files - Object containing project files and banner image
   * @returns Saved draft project
   * @throws BadRequestException if file type is invalid
   */
  @Post('draft')
  @ProjectFiles()
  async saveDraftProject(
    @Req() req: Request,
    @Body() updateProjectDto: UpdateProjectDto,
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
    // Extract files from request
    const documentFiles = files.file || [];
    const bannerImage = files.bannerImage?.[0] || null;
    return await this.projectService.saveDraftProject(
      updateProjectDto,
      req.user._id,
      documentFiles,
      bannerImage,
    );
  }

  /**
   * Updates an existing project with provided details and files
   * @param id - ID of project to update
   * @param updateProjectDto - DTO containing project updates
   * @param req - Express request object containing user info
   * @param files - Object containing project files and banner image
   * @returns Updated project
   * @throws BadRequestException if file type is invalid
   * @throws NotFoundException if project not found
   */
  @Put(':id')
  @ProjectFiles()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 5 },
        { name: 'bannerImage', maxCount: 1 },
      ],
      {
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
      },
    ),
  )
  async updateProject(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
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
    files: {
      file?: Express.Multer.File[];
      bannerImage?: Express.Multer.File[];
    },
  ) {
    // Extract files from request
    const documentFiles = files.file || [];
    const bannerImage = files.bannerImage?.[0] || null;
    // Forward request to service layer
    return await this.projectService.update(
      id,
      updateProjectDto,
      req.user._id,
      documentFiles,
      bannerImage,
    );
  }
  @Get('single/:id')
  async getSingleProject(@Param('id') id: Types.ObjectId) {
    return await this.projectService.getSingleProject(id);
  }

  @Get('all-projects')
  async getAllProjects(
    @Query('status') status: 'published' | 'proposed',
    @Query('page', new ParseIntPipe()) page: number,
    @Query('limit', new ParseIntPipe()) limit: number,
    @Query('isActive', new ParseBoolPipe()) isActive: boolean,
    @Query('search') search: string,
    @Query('node') node?: Types.ObjectId,
    @Query('club') club?: Types.ObjectId,
  ) {
    return await this.projectService.getAllProjects(
      status,
      page,
      limit,
      isActive,
      search,
      node,
      club,
    );
  }
  @Get('my-projects')
  async getMyProjects(
    @Req() req: Request,
    @Query('status', new ParseBoolPipe()) status: boolean,
    @Query('page', new ParseIntPipe()) page: number,
    @Query('limit', new ParseIntPipe()) limit: number,
  ) {
    return await this.projectService.getMyProjects(
      req.user._id,
      status,
      page,
      limit,
    );
  }
}
