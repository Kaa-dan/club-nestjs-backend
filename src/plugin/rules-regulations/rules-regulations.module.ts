import { Module } from '@nestjs/common';
import { RulesRegulationsController } from './rules-regulations.controller';
import { RulesRegulationsService } from './rules-regulations.service';

import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [SharedModule],

  controllers: [RulesRegulationsController],

  providers: [RulesRegulationsService],
})
export class RulesRegulationsModule {}
