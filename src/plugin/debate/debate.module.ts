import { Module } from '@nestjs/common';
import { DebateController } from './debate.controller';
import { DebateService } from './debate.service';
import { SharedModule } from 'src/shared/shared.module';
@Module({
  imports: [SharedModule],
  controllers: [DebateController],
  providers: [DebateService],
})
export class DebateModule {}
