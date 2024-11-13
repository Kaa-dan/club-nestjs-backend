import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reports } from 'src/shared/entities/reports.entity';
import { CreateReportDto } from './dto/createreport.dto';

@Injectable()
export class ReportService {
  constructor(@InjectModel(Reports.name) private reportModel: Model<Reports>) {}

  async report(userId: Types.ObjectId, reportData: CreateReportDto) {
    const response = await this.reportModel.create({
      type: reportData.type,
      reportedBy: userId,
      typeId: reportData.typeId,
    });
  }
}
