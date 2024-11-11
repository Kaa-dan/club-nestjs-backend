import { Module } from '@nestjs/common';
import { RulesRegulationsModule } from './rules-regulations/rules-regulations.module';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [RulesRegulationsModule, SharedModule],
  exports: [RulesRegulationsModule],
})
export class PluginModule {}
