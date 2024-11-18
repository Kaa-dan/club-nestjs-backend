import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Issues } from 'src/shared/entities/issues.entity';
import { UploadService } from 'src/shared/upload/upload.service';
import { CreateIssuesDto } from './dto/create-issue.dto';

@Injectable()
export class IssuesService {
  constructor(
    @InjectModel(Issues.name)
    private readonly issuesModel: Model<Issues>,
    private readonly s3FileUpload: UploadService,
  ) {}

  async createIssue(issueData: CreateIssuesDto): Promise<Issues> {
    const { files: files, node, club, ...restData } = issueData;

    const newIssue = new this.issuesModel(issueData);
    return newIssue.save();
  }
}
