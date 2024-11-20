import { Module } from '@nestjs/common';
import { RulesRegulationsModule } from './rules-regulations/rules-regulations.module';
import { SharedModule } from 'src/shared/shared.module';
import { IssuesModule } from './issues/issues.module';
import { DebateModule } from './debate/debate.module';

@Module({
  imports: [RulesRegulationsModule, IssuesModule, SharedModule, DebateModule],
  exports: [RulesRegulationsModule, IssuesModule],
})
export class PluginModule {}
