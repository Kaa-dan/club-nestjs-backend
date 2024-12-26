import { Body, Controller, Post, Req, ValidationPipe } from '@nestjs/common';
import { Request } from 'express';
import { CreateChapterDto } from './dto/chapter.dto';
import { ChapterService } from './chapter.service';
import { Types } from 'mongoose';
import { Roles } from 'src/decorators/role.decorator';

@Controller('chapters')
export class ChapterController {
    constructor(private readonly chapterService: ChapterService) { }

    @Roles('owner', 'admin', 'moderator', 'member')
    @Post()
    async createChapter(
        @Req() req: Request,
        @Body(
            new ValidationPipe({
                transform: true, // Enable transformation
                transformOptions: {
                    enableImplicitConversion: true, // Enable implicit conversions
                },
                whitelist: true,
                forbidNonWhitelisted: true,
            }),
        ) createChapterDto: CreateChapterDto
    ) {
        const chapterUserData = {
            userRole: req.role,
            userId: new Types.ObjectId(req.user._id)
        }
        return await this.chapterService.createChapter(createChapterDto, chapterUserData);
    }

    async getAllClubsOfUser(@Req() req: Request) {
        const userId = new Types.ObjectId(req.user._id);
        return await this.chapterService.getAllClubsOfUser(userId);
    }
}
