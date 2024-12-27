import { Body, Controller, Get, Post, Query, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { Request } from 'express';
import { CreateChapterDto } from './dto/chapter.dto';
import { ChapterService } from './chapter.service';
import { Types } from 'mongoose';
import { Roles } from 'src/decorators/role.decorator';
import { NodeRoleGuard } from '../guards/node/node-role.guard';

@Controller('chapters')
export class ChapterController {
    constructor(private readonly chapterService: ChapterService) { }

    @Roles('owner', 'admin', 'moderator', 'member')
    @UseGuards(NodeRoleGuard)
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

    @Roles('owner', 'admin', 'moderator', 'member')
    @Get()
    async getPublicClubsOfUser(@Req() req: Request, @Query('nodeId') node: string) {
        const userId = new Types.ObjectId(req.user._id);
        const nodeId = new Types.ObjectId(node);
        return await this.chapterService.getPublicClubsOfUser(userId, nodeId);
    }
}
