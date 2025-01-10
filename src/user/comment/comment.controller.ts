import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { SkipAuth } from 'src/decorators/skip-auth.decorator';
import { CreateCommentDto } from './dto/comment.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Types } from 'mongoose';
import { FileValidationPipe } from 'src/shared/pipes/file-validation.pipe';
import { RulesRegulations } from 'src/shared/entities/rules-regulations.entity';
import { Issues } from 'src/shared/entities/issues/issues.entity';
import { Project } from 'src/shared/entities/projects/project.entity';

@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) { }

  @Get()
  async getAllComments() {
    return await this.commentService.getAllComments();
  }

  @Get(':entityType/:entityId')
  async getCommentsByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: Types.ObjectId,
  ) {
    const entity =
      entityType === 'rules'
        ? RulesRegulations.name
        : entityType === 'issues'
          ? Issues.name
          : entityType === 'projects'
            ? Project.name
            : '';
    return this.commentService.getCommentsByEntity(entity, entityId);
  }

  @UseInterceptors(FilesInterceptor('file', 1, { storage: memoryStorage() }))
  @Post()
  async createComment(
    @Req() req,
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
        },
      }),
    )
    file: Express.Multer.File[],
    @Body() createCommentDto: CreateCommentDto,
  ) {
    const entity =
      createCommentDto.entityType === 'rules'
        ? RulesRegulations.name
        : createCommentDto.entityType === 'issues'
          ? Issues.name
          : createCommentDto.entityType === 'projects'
            ? Project.name
            : '';
    createCommentDto.entityType = entity;
    const userId = new Types.ObjectId(req.user._id);
    return await this.commentService.createComment(
      createCommentDto,
      userId,
      file[0],
    );
  }

  @Put('like/:id')
  async likeComment(@Req() req, @Param('id') commentId: string) {
    const userId = new Types.ObjectId(req.user._id);
    return await this.commentService.likeComment(
      new Types.ObjectId(commentId),
      userId,
    );
  }

  @Put('dislike/:id')
  async dislikeComment(@Req() req, @Param('id') commentId: string) {
    const userId = new Types.ObjectId(req.user._id);
    return await this.commentService.dislikeComment(
      new Types.ObjectId(commentId),
      userId,
    );
  }

  @Put('delete/:id')
  async deleteComment(@Req() req, @Param('id') commentId: string) {
    return await this.commentService.deleteComment(
      new Types.ObjectId(commentId),
    );
  }
}
