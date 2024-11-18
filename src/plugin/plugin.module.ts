import { Module } from '@nestjs/common';
import { RulesRegulationsModule } from './rules-regulations/rules-regulations.module';
import { SharedModule } from 'src/shared/shared.module';
import { IssuesModule } from './issues/issues.module';

@Module({
  imports: [RulesRegulationsModule, SharedModule, IssuesModule],
  exports: [RulesRegulationsModule],
})
export class PluginModule {}
