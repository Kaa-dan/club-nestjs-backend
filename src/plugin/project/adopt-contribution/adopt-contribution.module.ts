import { Module } from '@nestjs/common';
import { AdoptContributionService } from './adopt-contribution.service';
import { AdoptContributionController } from './adopt-contribution.controller';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [AdoptContributionController],
  providers: [AdoptContributionService],
  exports: [AdoptContributionService],
})
export class AdoptContributionModule {}
