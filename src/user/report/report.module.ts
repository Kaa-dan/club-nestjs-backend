import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
