import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { SharedModule } from 'src/shared/shared.module';
import { AdoptContributionModule } from './adopt-contribution/adopt-contribution.module';

@Module({
  imports: [SharedModule, AdoptContributionModule],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
