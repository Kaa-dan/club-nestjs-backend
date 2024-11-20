import { Module } from '@nestjs/common';
import { RulesRegulationsController } from './rules-regulations.controller';
import { RulesRegulationsService } from './rules-regulations.service';

import { SharedModule } from 'src/shared/shared.module';
import { CommentModule } from 'src/user/comment/comment.module';

@Module({
  imports: [SharedModule, CommentModule],

  controllers: [RulesRegulationsController],

  providers: [RulesRegulationsService],
})
export class RulesRegulationsModule { }
