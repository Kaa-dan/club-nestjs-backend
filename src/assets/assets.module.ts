import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { SharedModule } from 'src/shared/shared.module';
import { BookmarksService } from 'src/user/bookmarks/bookmarks.service';

@Module({
  controllers: [AssetsController],
  providers: [AssetsService, BookmarksService],
  imports: [SharedModule],
})
export class AssetsModule { }
