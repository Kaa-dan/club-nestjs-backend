import { Body, Controller, Post, Req } from '@nestjs/common';
import { report } from 'process';
import { CreateReportDto } from './dto/createreport.dto';
import { Request } from 'express';
import { ReportService } from './report.service';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}
  @Post()
  report(@Body() reportData: CreateReportDto, @Req() req: Request) {
    try {
      return this.reportService.report(req.user._id, reportData);
    } catch (error) {}
  }
}
