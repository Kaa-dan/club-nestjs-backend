import { Body, Controller, Get, Post, Query, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { Request } from 'express';
import { CreateChapterDto, JoinUserChapterDto, RemoveUserChapterDto, UpdateChapterStatusDto } from './dto/chapter.dto';
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

    @Get('get-published')
    async getPublishedChaptersOfNode(@Req() req: Request, @Query('nodeId') node: string) {
        const nodeId = new Types.ObjectId(node);
        return await this.chapterService.getPublishedChaptersOfNode(nodeId);
    }

    @Get('get-public-clubs')
    async getPublicClubs(@Req() req: Request, @Query('nodeId') node: string, @Query('term') term: string) {
        const nodeId = new Types.ObjectId(node);
        return await this.chapterService.getPublicClubs(nodeId, term);
    }

    @Get('get-proposed')
    async getProposedChaptersOfNode(@Req() req: Request, @Query('nodeId') node: string) {
        const nodeId = new Types.ObjectId(node);
        return await this.chapterService.getProposedChaptersOfNode(nodeId);
    }

    @Roles('owner', 'admin', 'moderator')
    @UseGuards(NodeRoleGuard)
    @Post('publish-or-reject')
    async publishOrRejectChapter(
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
        ) updateChapterStatusDto: UpdateChapterStatusDto
    ) {
        const chapterUserData = {
            userRole: req.role,
            userId: new Types.ObjectId(req.user._id),
        }

        return await this.chapterService.publishOrRejectChapter(chapterUserData, updateChapterStatusDto);
    }

    @Roles('owner', 'admin', 'moderator', 'member')
    @UseGuards(NodeRoleGuard)
    @Post('join-user')
    async joinChapter(
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
        ) joinUserChapterDto: JoinUserChapterDto
    ) {
        const userData = {
            userId: new Types.ObjectId(req.user._id),
            userRole: req.role,
        }
        return await this.chapterService.joinChapter(userData, joinUserChapterDto);
    }


    @Roles('owner', 'admin', 'moderator')
    @UseGuards(NodeRoleGuard)
    @Post('remove-user')
    async removeUserFromChapter(
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
        ) removeUserChapterDto: RemoveUserChapterDto
    ) {
        const userId = new Types.ObjectId(req.user._id);
        return await this.chapterService.removeUserFromChapter(userId, removeUserChapterDto);
    }
}
