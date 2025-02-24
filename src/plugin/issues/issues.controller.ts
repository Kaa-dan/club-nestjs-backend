import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
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
import e, { query, Request } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Types } from 'mongoose';
import { Issues } from 'src/shared/entities/issues/issues.entity';
import { CreateSolutionDto } from './dto/create-solution.dto';

@Controller('issues')
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) { }

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
        whoShouldAddress: createIssuesData.whoShouldAddress.split(','),
      };

      return await this.issuesService.createIssue(dataToSave);
    }

    if (!['admin', 'owner'].includes(memberRole)) {
      const dataToSave = {
        ...createIssuesData,
        createdBy: new Types.ObjectId(req.user._id),
        isActive: false,
        files,
        publishedStatus: 'proposed',
        whoShouldAddress: createIssuesData.whoShouldAddress.split(','),
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
      whoShouldAddress: createIssuesData.whoShouldAddress.split(','),
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

  @Get('get-issue/:issueId')
  async getIssue(@Req() req: Request, @Param('issueId') issueId) {
    return await this.issuesService.getIssue(new Types.ObjectId(issueId));
  }

  @Get('get-all-active-issues')
  async getAllActiveIssues(
    @Req() req: Request,
    @Query('entity') entity: 'node' | 'club',
    @Query('entityId') entityId: string,
    @Query('page') page: number
  ) {
    return await this.issuesService.getAllActiveIssues(
      entity,
      new Types.ObjectId(entityId),
      page
    );
  }

  @Get('all-issues')
  async getAllIssues(
    @Req() req: Request,
    @Query('entity') entity: 'node' | 'club',
    @Query('entityId') entityId: string,
    @Query('page') page: number
  ) {
    return await this.issuesService.getAllIssues(
      entity,
      new Types.ObjectId(entityId),
      page
    );
  }

  @Get('get-my-issues')
  async getMyIssues(
    @Req() req: Request,
    @Query('entity') entity: 'node' | 'club',
    @Query('entityId') entityId: string,
    @Query('page') page: number
  ) {
    return await this.issuesService.getMyIssues(
      new Types.ObjectId(req.user._id),
      entity,
      new Types.ObjectId(entityId),
      page
    );
  }
  @Get('global-active-issues')
  async getGlobalActiveIssues(@Query('page') page: number) {
    return await this.issuesService.getGlobalActiveIssues(page);
  }
  @Post('adopt-issue')
  async adoptIssueAndPropose(@Req() req: Request, @Body() data) {
    console.log({ data })
    return await this.issuesService.adoptIssueAndPropose(
      new Types.ObjectId(req.user._id),
      data,
    );
  }

  @Post('adopt-proposed-issue/:issueId')
  async adoptProposedIssue(@Req() req: Request, @Param('issueId') issueId) {
    return this.issuesService.adoptProposedIssue(
      new Types.ObjectId(req.user._id),
      new Types.ObjectId(issueId),
    );
  }

  @Get('proposed-issues/:entity/:entityId')
  async getProposedIssues(
    @Req() req: Request,
    @Param('entity') entity,
    @Param('entityId') entityId,
  ) {
    return this.issuesService.getProposedIssues(
      entity,
      new Types.ObjectId(entityId),
    );
  }

  @Put('like/:issueId')
  async likeIssue(@Req() req: Request, @Param('issueId') issueId) {
    return await this.issuesService.likeIssue(
      new Types.ObjectId(req.user._id),
      new Types.ObjectId(issueId),
    );
  }

  @Put('dislike/:issueId')
  async dislikeIssue(@Req() req: Request, @Param('issueId') issueId) {
    return await this.issuesService.dislikeIssue(
      new Types.ObjectId(req.user._id),
      new Types.ObjectId(issueId),
    );
  }

  @Get('get-clubs-and-nodes-not-adopted/:issueId')
  async getClubsNodesNotAdopted(
    @Req() req: Request,
    @Param('issueId') issueId,
  ) {
    return await this.issuesService.getClubsNodesNotAdopted(
      new Types.ObjectId(req.user._id),
      new Types.ObjectId(issueId),
    );
  }

  @Post('create-solution')
  async createSolution(@Body() createSolution: CreateSolutionDto, @Req() { user }) {
    return await this.issuesService.createSolution(user._id, createSolution)
  }
}
