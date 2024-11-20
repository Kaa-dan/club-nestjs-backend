import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { IssuesService } from './issues.service';
import { FileValidationPipe } from 'src/shared/pipes/file-validation.pipe';
import { CreateIssuesDto } from './dto/create-issue.dto';
import e, { Request } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Types } from 'mongoose';

@Controller('issues')
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  /**
   * POST / => Create Issue
   * GET / => Get All Issues
   * GET /:id => Get Issue by ID
   * PUT /:id => Update Issue by ID
   * DELETE /:id => Delete Issue by ID
   * GET /user/:userId => Get Issues by User ID
   * GET /club/:clubId => Get Issues by Club ID
   * GET /node/:nodeId => Get Issues by Node ID
   */

  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: memoryStorage(),
    }),
  )
  @Post()
  async createIssue(
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
    @Body() createIssuesData,
  ) {
    if (!createIssuesData.node && !createIssuesData.club) {
      throw new BadRequestException(
        'Invalid type parameter. Must be "node" or "club".',
      );
    }

    const memberRole = await this.issuesService.getMemberRoles(
      req.user._id,
      createIssuesData,
    );

    if (createIssuesData.publishedStatus === 'draft') {
      const dataToSave = {
        ...createIssuesData,
        createdBy: new Types.ObjectId(req.user._id),
        isActive: false,
        files,
      };

      return await this.issuesService.createIssue(dataToSave);
    }

    if (memberRole !== 'admin') {
      const dataToSave = {
        ...createIssuesData,
        createdBy: new Types.ObjectId(req.user._id),
        isActive: false,
        files,
        publishedStatus: 'proposed',
      };

      return await this.issuesService.createIssue(dataToSave);
    }

    const dataToSave = {
      ...createIssuesData,
      createdBy: new Types.ObjectId(req.user._id),
      publishedBy: new Types.ObjectId(req.user._id),
      publishedDate: new Date(),
      isActive: true,
      version: 1,
      files,
    };

    return await this.issuesService.createIssue(dataToSave);
  }

  @UseInterceptors(
    FilesInterceptor('file', 5, {
      storage: memoryStorage(),
    }),
  )
  @Put()
  async updateIssue(
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
    @Body() updateIssuesData,
  ) {
    const fileObjects = files.map((singleFile) => ({
      buffer: singleFile.buffer,
      originalname: singleFile.originalname,
      mimetype: singleFile.mimetype,
      size: singleFile.size,
    }));

    const dataToSave = {
      ...updateIssuesData,
      updatedBy: new Types.ObjectId(req.user._id),
      updatedDate: new Date(),
    };

    return await this.issuesService.updateIssue(
      new Types.ObjectId(req.user._id),
      dataToSave,
      fileObjects,
    );
  }

  @Get('get-all-active-issues')
  async getAllActiveIssues(
    @Req() req: Request,
    @Query('entity') entity: 'node' | 'club',
    @Query('entityId') entityId: string,
  ) {
    return await this.issuesService.getAllActiveIssues(
      entity,
      new Types.ObjectId(entityId),
    );
  }

  @Get('get-my-issues')
  async getMyIssues(
    @Req() req: Request,
    @Query('entity') entity: 'node' | 'club',
    @Query('entityId') entityId: string,
  ) {
    return await this.issuesService.getMyIssues(
      new Types.ObjectId(req.user._id),
      entity,
      new Types.ObjectId(entityId),
    );
  }
  @Get('global-active-issues')
  async getGlobalActiveIssues() {
    return await this.issuesService.getGlobalActiveIssues();
  }
  @Post('adopt-issue/:issueId')
  async adoptIssueAndPropose(@Req() req: Request, @Body() data) {
    return await this.issuesService.adoptIssueAndPropose(
      new Types.ObjectId(req.user._id),
      data,
    );
  }

  @Post('adopt-proposed-issue/:issueId')
  async adoptProposedIssue(@Req() req: Request, @Query('issueId') issueId) {
    return this.issuesService.adoptProposedIssue(
      new Types.ObjectId(req.user._id),
      new Types.ObjectId(issueId),
    );
  }
}
