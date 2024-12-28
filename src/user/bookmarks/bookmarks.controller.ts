import { Body, Controller } from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';
import { CreateFolderDto } from './dto/create-folder.dto';

@Controller('bookmarks')
export class BookmarksController {
    constructor(private readonly bookmarksService: BookmarksService) { }


    async createFolder(@Body() createFolderDto: CreateFolderDto) {
        return this.bookmarksService.createFolder(createFolderDto);
    }

}
