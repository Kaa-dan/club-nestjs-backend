import { Model, PipelineStage, Types } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Project } from 'src/shared/entities/projects/project.entity';
import { Debate } from 'src/shared/entities/debate.entity';
import { Issues } from 'src/shared/entities/issues.entity';
@Injectable()
export class AssetsService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(Debate.name) private readonly debateModel: Model<Debate>,
    @InjectModel(Issues.name) private readonly issueModel: Model<Issues>,
  ) {}

  async getAssetsByEntity(
    entity: 'club' | 'node',
    entityId: string,
    page: number = 1,
    limit: number = 10
  ) {

    try {
      console.log({entity,entityId})
      const skip = (page - 1) * limit;
    
      const matchCondition = {
        [entity]: new Types.ObjectId(entityId),
      };
  
      const createPipeline = (type: 'Project' | 'Debate' | 'Issue'): PipelineStage[] => [
        {
          $match: matchCondition,
        },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'author',
          },
        },
        {
          $unwind: {
            path: '$author',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            [entity]: 1,
            title: 1,
            createdAt: 1,
            content: 1,
            author: {
              name: { $concat: ['$author.firstName', ' ', '$author.lastName'] },
              email: '$author.email',
            },
            type: { $literal: type },
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ];
  
      // Execute count queries first
      const [projectCount, debateCount, issueCount] = await Promise.all([
        this.projectModel.countDocuments(matchCondition),
        this.debateModel.countDocuments(matchCondition),
        this.issueModel.countDocuments(matchCondition),
      ]);
  
      const total = projectCount + debateCount + issueCount;
  
      // Add pagination stages to pipeline
      const paginatedPipeline = (type: 'Project' | 'Debate' | 'Issue'): PipelineStage[] => [
        ...createPipeline(type),
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
      ];
  
      // Execute aggregation on each collection with pagination
      const [projects, debates, issues] = await Promise.all([
        this.projectModel.aggregate(paginatedPipeline('Project')).exec(),
        this.debateModel.aggregate(paginatedPipeline('Debate')).exec(),
        this.issueModel.aggregate(paginatedPipeline('Issue')).exec(),
      ]);
  
      // Combine and sort results
      const allResults = [...projects, ...debates, ...issues]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
        console.log({allResults})
      return {
        items: allResults,
        total,
        page,
        limit,
        hasMore: skip + limit < total,
      };
    } catch (error) {
      console.log({error})
      throw error
    }

  
  }
}