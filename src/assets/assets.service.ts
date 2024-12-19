import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, PipelineStage } from 'mongoose';

import { Issues } from 'src/shared/entities/issues.entity';
import { Debate } from 'src/shared/entities/debate.entity';
import { Project } from 'src/shared/entities/projects/project.entity';

interface FeedQueryParams {
  entityId: string;
  entityType: 'club' | 'node';
  limit?: number;
  lastId?: string;
}

@Injectable()
export class AssetsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(Debate.name) private debateModel: Model<Debate>,
    @InjectModel(Issues.name) private issuesModel: Model<Issues>,
  ) {}

  async getFeed({ entityId, entityType, limit = 10, lastId }: FeedQueryParams) {
    const matchStage: PipelineStage.Match = {
      $match: {
        [entityType]: new Types.ObjectId(entityId),
        status: 'published',
        isDeleted: { $ne: true },
        ...(lastId && { _id: { $lt: new Types.ObjectId(lastId) } }),
      },
    };

    const pipeline: PipelineStage[] = [
      {
        $facet: {
          projects: [
            matchStage,
            {
              $project: {
                _id: 1,
                title: 1,
                significance: 1,
                solution: 1,
                region: 1,
                budget: 1,
                deadline: 1,
                bannerImage: 1,
                committees: 1,
                champions: 1,
                files: 1,
                createdAt: 1,
                createdBy: 1,
                publishedBy: 1,
                club: 1,
                node: 1,
                type: { $literal: 'project' },
                relevant: { $size: { $ifNull: ['$relevant', []] } },
                irrelevant: { $size: { $ifNull: ['$irrelevant', []] } },
              },
            },
          ],
          debates: [
            matchStage,
            {
              $project: {
                _id: 1,
                title: '$topic',
                significance: 1,
                targetAudience: 1,
                tags: 1,
                files: 1,
                isPublic: 1,
                startingComment: 1,
                adoptedClubs: 1,
                adoptedNodes: 1,
                views: 1,
                createdAt: 1,
                createdBy: 1,
                publishedBy: 1,
                publishedStatus: 1,
                club: 1,
                node: 1,
                type: { $literal: 'debate' },
                relevant: '$pinnedSupportCount',
                irrelevant: '$pinnedAgainstCount',
              },
            },
          ],
          issues: [
            matchStage,
            {
              $project: {
                _id: 1,
                title: 1,
                issueType: 1,
                whereOrWho: 1,
                deadline: 1,
                significance: 1,
                whoShouldAddress: 1,
                description: 1,
                files: 1,
                isPublic: 1,
                isAnonymous: 1,
                views: 1,
                adoptedClubs: 1,
                adoptedNodes: 1,
                createdAt: 1,
                createdBy: 1,
                publishedBy: 1,
                publishedStatus: 1,
                club: 1,
                node: 1,
                type: { $literal: 'issue' },
                relevant: { $size: { $ifNull: ['$relevant', []] } },
                irrelevant: { $size: { $ifNull: ['$irrelevant', []] } },
              },
            },
          ],
        },
      } as PipelineStage,
      {
        $project: {
          combined: {
            $concatArrays: ['$projects', '$debates', '$issues'],
          },
        },
      } as PipelineStage.Project,
      {
        $unwind: '$combined',
      } as PipelineStage.Unwind,
      {
        $replaceRoot: { newRoot: '$combined' },
      } as PipelineStage.ReplaceRoot,
      {
        $sort: { createdAt: -1 },
      } as PipelineStage.Sort,
      {
        $limit: limit,
      } as PipelineStage.Limit,
    ];

    const assets = await this.projectModel.aggregate(pipeline);

    const lastItemId = assets.length > 0 ? assets[assets.length - 1]._id : null;
    const hasMore = assets.length === limit;

    return {
      items: assets,
      hasMore,
      lastId: lastItemId,
      total: assets.length,
    };
  }
}
