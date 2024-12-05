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

@Module({
  imports: [
    RulesRegulationsModule,
    IssuesModule,
    SharedModule,
    DebateModule,
    ProjectModule,
  ],
  exports: [RulesRegulationsModule, IssuesModule],
})
export class PluginModule {}
