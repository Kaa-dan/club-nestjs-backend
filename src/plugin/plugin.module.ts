import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { RulesRegulationsModule } from './rules-regulations/rules-regulations.module';
import { SharedModule } from 'src/shared/shared.module';
import { IssuesModule } from './issues/issues.module';
import { DebateModule } from './debate/debate.module';
import { ProjectModule } from './project/project.module';
import { AdoptContributionModule } from './project/adopt-contribution/adopt-contribution.module';

@Module({
  imports: [
    RulesRegulationsModule,
    IssuesModule,
    SharedModule,
    DebateModule,
    ProjectModule,
    AdoptContributionModule,
  ],
  exports: [RulesRegulationsModule, IssuesModule],
})
export class PluginModule {}
