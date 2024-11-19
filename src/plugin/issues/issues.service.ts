import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Issues } from 'src/shared/entities/issues.entity';
import { UploadService } from 'src/shared/upload/upload.service';
import { CreateIssuesDto } from './dto/create-issue.dto';

@Injectable()
export class IssuesService {
  constructor(
    @InjectModel(Issues.name)
    private readonly issuesModel: Model<Issues>,
  ) {}

  async createIssue(issueData: CreateIssuesDto) {
    // const transformedData = {
    //   ...issueData,
    //   // Transform node if it exists
    //   node: issueData.node
    //     ? new Types.ObjectId(issueData.node.toString())
    //     : undefined,
    //   // Transform club if it exists
    //   club: issueData.club
    //     ? new Types.ObjectId(issueData.club.toString())
    //     : undefined,
    //   // Transform whoShouldAddress array if it exists
    //   whoShouldAddress: issueData.whoShouldAddress?.map(
    //     (id) => new Types.ObjectId(id.toString()),
    //   ),
    // };

    try {
      console.log('transformedData', issueData);

      //   return issueData;
      const newIssue = new this.issuesModel(issueData);
      return newIssue.save();
    } catch (error) {
      throw new Error(`Error creating issue: ${error.message}`);
    }
  }
}
