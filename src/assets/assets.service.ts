import { Model, PipelineStage, Types } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Project } from 'src/shared/entities/projects/project.entity';
import { Debate } from 'src/shared/entities/debate.entity';
import { Issues } from 'src/shared/entities/issues/issues.entity';
@Injectable()
@Injectable()
export class AssetsService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(Debate.name) private readonly debateModel: Model<Debate>,
    @InjectModel(Issues.name) private readonly issueModel: Model<Issues>,
  ) { }

  async getAssetsByEntity(
    entity: 'club' | 'node',
    entityId: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;
      const matchCondition = {
        [entity]: new Types.ObjectId(entityId),
      };

      const createPipeline = (type: 'projects' | 'debate' | 'issues'): PipelineStage[] => [
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
            // Conditional fields based on type
            projectSignificance: {
              $cond: {
                if: { $eq: ['projects', type] },
                then: '$significance',
                else: '$$REMOVE'
              }
            },
            debateSignificance: {
              $cond: {
                if: { $eq: ['debate', type] },
                then: '$significance',
                else: '$$REMOVE'
              }
            },
            issueSignificance: {
              $cond: {
                if: { $eq: ['issues', type] },
                then: '$significance',
                else: '$$REMOVE'
              }
            },
            files: {
              $cond: {
                if: { $isArray: '$files' },
                then: '$files',
                else: []
              }
            },
            author: {
              name: { $concat: ['$author.firstName', ' ', '$author.lastName'] },
              email: '$author.email',
            },
            type: { $literal: type },
            relevant: 1,
            irrelevant: 1
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
      const paginatedPipeline = (type: 'projects' | 'debate' | 'issues'): PipelineStage[] => [
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
        this.projectModel.aggregate(paginatedPipeline('projects')).exec(),
        this.debateModel.aggregate(paginatedPipeline('debate')).exec(),
        this.issueModel.aggregate(paginatedPipeline('issues')).exec(),
      ]);

      // Combine and sort results
      const allResults = [...projects, ...debates, ...issues]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
      return {
        items: allResults,
        total,
        page,
        limit,
        hasMore: skip + limit < total,
      };
    } catch (error) {
      console.log({ error });
      throw error;
    }
  }


  async feedRelevancyAction(
    type: 'projects' | 'issues',
    assetId: string,
    action: 'like' | 'dislike',
    userId: string,
  ) {
    try {
      // Convert userId to ObjectId
      const userObjectId = new Types.ObjectId(userId);

      // Select model based on type
      let model: Model<any>;
      switch (type) {
        case 'projects':
          model = this.projectModel;
          break;
        case 'issues':
          model = this.issueModel;
          break;
        default:
          throw new Error('Invalid content type');
      }

      // Get current document state
      let currentDoc = await model.findById(assetId);
      if (!currentDoc) {
        throw new Error(`${type} document not found`);
      }

      // Ensure arrays exist in the document
      if (!currentDoc.relevant || !currentDoc.irrelevant) {
        await model.updateOne(
          { _id: assetId },
          { $set: { relevant: [], irrelevant: [] } }
        );
        currentDoc = await model.findById(assetId); // Refresh the document
      }

      if (action === 'like') {
        // Remove the user from irrelevant first, if they exist there
        await model.updateOne(
          { _id: assetId },
          { $pull: { irrelevant: { user: userObjectId } } }
        );

        // Check if the user already exists in relevant
        const alreadyLiked = currentDoc.relevant.some(
          (entry: any) => entry.user.equals(userObjectId)
        );

        if (alreadyLiked) {
          // Remove the user from relevant if they already liked
          await model.updateOne(
            { _id: assetId },
            { $pull: { relevant: { user: userObjectId } } }
          );
        } else {
          // Add the user to relevant
          const relevantEntry = { user: userObjectId, date: new Date() };
          await model.updateOne(
            { _id: assetId },
            { $addToSet: { relevant: relevantEntry } }
          );
        }
      } else if (action === 'dislike') {
        // Remove the user from relevant first, if they exist there
        await model.updateOne(
          { _id: assetId },
          { $pull: { relevant: { user: userObjectId } } }
        );

        // Check if the user already exists in irrelevant
        const alreadyDisliked = currentDoc.irrelevant.some(
          (entry: any) => entry.user.equals(userObjectId)
        );

        if (alreadyDisliked) {
          // Remove the user from irrelevant if they already disliked
          await model.updateOne(
            { _id: assetId },
            { $pull: { irrelevant: { user: userObjectId } } }
          );
        } else {
          // Add the user to irrelevant
          const irrelevantEntry = { user: userObjectId, date: new Date() };
          await model.updateOne(
            { _id: assetId },
            { $addToSet: { irrelevant: irrelevantEntry } }
          );
        }
      }

      return {
        success: true,
        data: await model.findById(assetId),
      };
    } catch (error) {
      throw new Error(`Failed to update relevancy: ${error.message}`);
    }
  }


}