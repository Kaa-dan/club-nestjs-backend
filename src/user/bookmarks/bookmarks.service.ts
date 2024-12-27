import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Bookmarks } from 'src/shared/entities/bookmarks.enntity';

@Injectable()
export class BookmarksService {

    constructor(@InjectModel(Bookmarks.name) private readonly bookmarksModel) { }
    async createFolder(createFolderDto: any) {
        try {

            const createFolder = await this.bookmarksModel.create({
                title: createFolderDto.title,
                user: createFolderDto.user,
                posts: []
            })

            return {
                status: 'success',
                message: 'Folder created successfully',
                data: createFolder
            }

        } catch (error) {
            throw error;
        }
    }
}
