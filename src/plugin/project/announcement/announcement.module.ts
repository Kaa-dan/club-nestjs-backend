import { Module } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { AnnouncementController } from './announcement.controller';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [AnnouncementController],
  providers: [AnnouncementService],
  exports: [AnnouncementService]
})
export class AnnouncementModule { }
