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
  Patch,
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
import { User } from 'src/shared/entities/user.entity';
import { AnswerFaqDto, CreateDtoFaq } from './dto/faq.dto';

/**
 * Controller handling all project-related operations
 * Includes functionality for creating, reading, updating and managing projects
 */
@ApiTags('Projects')
@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) { }

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
    // @Body() createProjectDto: CreateProjectDto,
    @Body() createProjectDto: CreateProjectDto,
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
    console.log({ documentFiles, bannerImage })
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
    @Query('chapter') chapter?: Types.ObjectId,
  ) {

    return await this.projectService.getAllProjects(
      status,
      page,
      limit,
      isActive,
      search,
      node,
      club
    );
  }

  @Get('chapter-all-projects')
  async getChapterAllProjects(
    @Query('status') status: 'published' | 'proposed',
    @Query('page', new ParseIntPipe()) page: number,
    @Query('limit', new ParseIntPipe()) limit: number,
    @Query('isActive', new ParseBoolPipe()) isActive: boolean,
    @Query('search') search: string,
    @Query('chapter') chapter?: Types.ObjectId,
  ) {

    return await this.projectService.getChapterAllProjects(
      status,
      page,
      limit,
      isActive,
      search,
      chapter
    );
  }

  @Get('chapter-all-club-projects')
  async getAllClubProjectsWithChapterId(
    @Query('page', new ParseIntPipe()) page: number,
    @Query('limit', new ParseIntPipe()) limit: number,
    @Query('isActive', new ParseBoolPipe()) isActive: boolean,
    @Query('search') search: string,
    @Query('chapter') chapter?: Types.ObjectId,
  ) {

    console.log('hehehe club chap')

    return await this.projectService.getAllClubProjectsWithChapterId(
      page,
      limit,
      isActive,
      search,
      chapter
    );
  }

  @Get('my-projects')
  async getMyProjects(
    @Req() req: Request,
    @Query('page', new ParseIntPipe()) page: number,
    @Query('limit', new ParseIntPipe()) limit: number,
    @Query('node') node?: Types.ObjectId,
    @Query('club') club?: Types.ObjectId,
  ) {
    return await this.projectService.getMyProjects(
      req.user._id,
      page,
      limit,
      node,
      club,
    );
  }

  @Get('global-projects')
  async getGlobalProjects(
    @Req() req: Request,
    @Query('page', new ParseIntPipe()) page: number,
    @Query('limit', new ParseIntPipe()) limit: number,
  ) {
    return await this.projectService.getGlobalProjects(page, limit);
  }


  @Get('contributions/:projectId/:status')
  async getContributions(@Req() { user }, @Param('projectId') projectId: Types.ObjectId, @Param('status') status: 'accepted' | 'pending' | 'rejected') {
    return await this.projectService.getContributions(user._id, projectId, status)
  }

  @Put('accept-contributions/:contributionId/:type')
  async acceptOrRejectContributions(@Req() { user }, @Param('contributionId') contributionId: Types.ObjectId, @Param('type', ParseBoolPipe) type: boolean) {
    return this.projectService.acceptOrRejectContributions(user._id, contributionId, type)
  }
  /**
   * @get 

   */

  @Put('accept-proposed-project/:projectId/:type')
  async acceptOrRejectProposedProjectInForum(@Req() { user },
    @Param('projectId') projectId: Types.ObjectId,
    @Param('type') type: 'accept' | 'reject',
    @Body() { creationType }: { creationType: 'proposed' | 'creation' }) {
    return this.projectService.acceptOrRejectProposedProjectInForum(user._id, projectId, type, creationType);
  }

  @Post('ask-faq')
  async askFaq(@Req() { user }, @Body() createFaqDto: CreateDtoFaq) {
    return this.projectService.askFaq(user._id, createFaqDto)
  }

  @Get('get-faq/:projectId')
  async getQuestionFaq(@Param('projectId') projectID: Types.ObjectId) {
    return this.getQuestionFaq(projectID)
  }

  @Put('answer-faq')
  async answerFaq(@Req() { user }, @Body() answerFaqDto: AnswerFaqDto) {
    return this.answerFaq(user._id, answerFaqDto)
  }

  @Patch('/react')
  async reactToPost(
    @Req() { user },
    @Body('postId') postId: string,

    @Body('action') action: 'like' | 'dislike'
  ) {
    return this.projectService.reactToPost(postId, user?._id, action);
  }
}