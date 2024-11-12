import { Body, Controller, Get, Param, Post, Put, Req, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
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

    @Get()
    async getAllComments() {
        return await this.commentService.getAllComments();
    }

    @UseInterceptors(
        FilesInterceptor('file', 1, { storage: memoryStorage() }),
    )
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
                    ]
                },
            })
        )
        file: Express.Multer.File[],
        @Body() createCommentDto: CreateCommentDto,
    ) {
        // console.log(file[0], 'file')
        const userId = new Types.ObjectId(req.user._id);
        return await this.commentService.createComment(createCommentDto, userId, file[0]);
    }

    @Put(':id/like')
    async likeComment(@Req() req, @Param('id') commentId: string) {
        const userId = new Types.ObjectId(req.user._id);
        return await this.commentService.likeComment(new Types.ObjectId(commentId), userId);
    }

    @Put(':id/dislike')
    async dislikeComment(@Req() req, @Param('id') commentId: string) {
        const userId = new Types.ObjectId(req.user._id);
        return await this.commentService.dislikeComment(new Types.ObjectId(commentId), userId);
    }

    @Put(':id/delete')
    async deleteComment(@Req() req, @Param('id') commentId: string) {
        const userId = new Types.ObjectId(req.user._id);
        return await this.commentService.deleteComment(new Types.ObjectId(commentId), userId);
    }

}
