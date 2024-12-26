import { Module } from '@nestjs/common';
import { ChapterController } from './chapter.controller';
import { ChapterService } from './chapter.service';
import { SharedModule } from 'src/shared/shared.module';
import { APP_GUARD } from '@nestjs/core';
import { NodeRoleGuard } from '../guards/node/node-role.guard';

@Module({
    imports: [
        SharedModule
    ],
    controllers: [ChapterController],
    providers: [
        ChapterService,
        {
            provide: APP_GUARD,
            useClass: NodeRoleGuard,
        }
    ]
})
export class ChapterModule { }
