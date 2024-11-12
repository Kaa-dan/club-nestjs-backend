import { Body, Controller, Get, Post, Req, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { CommentService } from './comment.service';
import { SkipAuth } from 'src/decorators/skip-auth.decorator';
import { CreateCommentDto } from './dto/comment.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Types } from 'mongoose';
import { FileValidationPipe } from 'src/shared/pipes/file-validation.pipe';

@Controller('comment')
export class CommentController {
    constructor(private readonly commentService: CommentService) { }

    // @SkipAuth()
    @Get()
    async getAllComments() {
        return await this.commentService.getAllComments();
    }

    @UseInterceptors(FilesInterceptor('file', 1, { storage: memoryStorage() }))
    @Post()
    async createComment(
        @Req() req,
        @UploadedFile(
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
                },
            })
        )
        file: Express.Multer.File[],
        @Body() createCommentDto: CreateCommentDto,
    ) {
        const userId = new Types.ObjectId(req.user._id);
        return await this.commentService.createComment(createCommentDto, userId);
    }
}
