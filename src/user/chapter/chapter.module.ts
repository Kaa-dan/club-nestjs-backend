import { Module } from '@nestjs/common';
import { ChapterController } from './chapter.controller';
import { ChapterService } from './chapter.service';
import { SharedModule } from 'src/shared/shared.module';

@Module({
    imports: [
        SharedModule
    ],
    controllers: [ChapterController],
    providers: [
        ChapterService,
    ]
})
export class ChapterModule { }
