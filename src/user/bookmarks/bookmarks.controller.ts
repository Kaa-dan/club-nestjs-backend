import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { Request } from 'express';
@Controller('bookmarks')
export class BookmarksController {
    constructor(private readonly bookmarksService: BookmarksService) { }

    @Get()
    fetchFolders(@Req() req: Request) {
        const userId = req.user._id
        return this.bookmarksService.fetchFolders(userId);
    }
    @Post('create')
    createFolder(@Body() createFolderDto: CreateFolderDto, @Req() req: Request) {
        const userId = req.user._id;
        createFolderDto.user = userId;
        return this.bookmarksService.createFolder(createFolderDto);
    }
    @Post('add')
    addToBookmark(@Body() { postType, postId, folderId }, @Req() req: Request) {

        const userId = req.user._id

        return this.bookmarksService.addToBookmark(folderId, userId, postId, postType)

    }
}
