import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotAcceptableException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { Issues } from 'src/shared/entities/issues/issues.entity';
import { UploadService } from 'src/shared/upload/upload.service';
import { CreateIssuesDto } from './dto/create-issue.dto';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';
import { NodeMembers } from 'src/shared/entities/node-members.entity';
import { async, publish } from 'rxjs';
import { Node_ } from 'src/shared/entities/node.entity';
import { Club } from 'src/shared/entities/club.entity';
import { title } from 'process';
import { CreateSolutionDto } from './dto/create-solution.dto';
import { IssuesAdoption } from 'src/shared/entities/issues/issues-adoption.entity';



interface FileObject {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class IssuesService {
  constructor(
    @InjectModel(Issues.name)
    private readonly issuesModel: Model<Issues>,
    private readonly s3FileUpload: UploadService,
    @InjectModel(ClubMembers.name)
    private readonly clubMembersModel: Model<ClubMembers>,
    @InjectModel(NodeMembers.name)
    private readonly nodeMembersModel: Model<NodeMembers>,
    @InjectModel(Node_.name)
    private readonly nodeModel: Model<Node_>,
    @InjectModel(Club.name)
    private readonly clubModel: Model<Club>,
    @InjectModel(IssuesAdoption.name) private readonly issueAdoptionModel: Model<IssuesAdoption>
  ) { }

  /**
   * Create a new issue. This function will also handle the upload of any files
   * associated with the issue.
   *
   * @param issueData - The create issue data
   * @returns The newly created issue
   */
  async createIssue(issueData: CreateIssuesDto) {
    const { files: files, node, club, ...restData } = issueData;
    let fileObjects = null;
    if (files) {
      const uploadPromises = files.map((file: FileObject) =>
        this.uploadFile({
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
        } as Express.Multer.File),
      );

      const uploadedFiles = await Promise.all(uploadPromises);

      fileObjects = uploadedFiles.map((uploadedFile, index) => ({
        url: uploadedFile.url,
        originalname: files[index].originalname,
        mimetype: files[index].mimetype,
        size: files[index].size,
      }));
    }
    try {
      const dataToSave = {
        ...restData,
        node: node ? new Types.ObjectId(node) : null,
        club: club ? new Types.ObjectId(club) : null,
        files: fileObjects,
      };

      const newIssue = new this.issuesModel(dataToSave);
      return await newIssue.save();
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while creating rules-regulations',
        error,
      );
    }
  }

  async updateIssue(userId: Types.ObjectId, dataToSave: any, updateFiles) {
    try {
      const currentVersion = await this.issuesModel.findById(dataToSave._id);

      if (!currentVersion) {
        throw new Error('Document not found');
      }

      const { files, ...restData } = dataToSave;

      let fileObjects = null;
      let mergedFiles = [files];

      if (updateFiles) {
        // Handle file uploads
        const uploadedFiles = await Promise.all(
          updateFiles.map((singlefile) => this.uploadFile(singlefile)),
        );

        // Create file objects
        fileObjects = uploadedFiles.map((uploadedFile, index) => ({
          url: uploadedFile.url,
          originalname: uploadedFile.originalname,
          mimetype: uploadedFile.mimetype,
          size: uploadedFile.size,
        }));

        mergedFiles = [...fileObjects];
      }

      // If the document is a draft, update the document
      if (dataToSave.publishedStatus === 'draft') {
        const updateData = await this.issuesModel.findByIdAndUpdate(
          dataToSave._id,
          {
            $set: {
              ...restData,
              files: mergedFiles,
            },
          },
        );

        return updateData;
      }

      // Check if the user is an admin or not
      const memberRole = await this.getMemberRoles(userId, dataToSave);

      // If the user is not an admin or owner or moderator, update the document to proposed
      if (!['admin', 'owner', 'moderator']?.includes(memberRole)) {
        const updateData = await this.issuesModel.findByIdAndUpdate(
          dataToSave._id,
          {
            $set: {
              ...restData,
              files: mergedFiles,
              publishedStatus: 'proposed',
            },
          },
        );

        return updateData;
      }

      // If the user is an admin, update the document to published
      const versionObject = {
        ...currentVersion.toObject(),
        version: currentVersion.version || 1,
        files: mergedFiles,
        publishedStatus: 'olderversion',
      };

      const updatedDocument = await this.issuesModel.findByIdAndUpdate(
        dataToSave._id,
        {
          $set: {
            ...restData,
            version: (currentVersion.version || 1) + 1,
            publishedBy: userId,
            publishedAt: new Date(),
          },
          $push: {
            olderVersions: versionObject,
          },
        },
        { new: true, runValidators: true },
      );

      return updatedDocument;
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while updating rules-regulations',
        error,
      );
    }
  }

  /**
   * Returns all active issues of a given entity
   * @param entity - The type of entity. It can be either 'node' or 'club'
   * @param entityId - The id of the entity
   * @returns An array of active issues
   */
  async getAllActiveIssues(
    entity: 'node' | 'club',
    entityId: Types.ObjectId,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      // Ensure page and limit are positive numbers
      const validPage = Math.max(1, page);
      const validLimit = Math.max(1, limit);
      const skip = (validPage - 1) * validLimit;

      // Construct the query based on entity type
      const query = {
        [entity]: entityId,
        isActive: true,
        publishedStatus: 'published',
      };

      // Get total count for pagination metadata
      const totalCount = await this.issuesModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / validLimit);

      // Get paginated results
      const issues = await this.issuesModel
        .find(query)
        .populate('createdBy', '-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(validLimit)
        .exec();

      // Return both the data and pagination metadata
      return {
        issues,
        pagination: {
          currentPage: validPage,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: validLimit,
          hasNextPage: validPage < totalPages,
          hasPreviousPage: validPage > 1
        }
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while getting active rules-regulations',
        error,
      );
    }
  }



  async getAllIssues(
    entity: 'node' | 'club',
    entityId: Types.ObjectId,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const validPage = Math.max(1, page);
      const validLimit = Math.max(1, limit);
      const skip = (validPage - 1) * validLimit;

      // Define the pipeline with proper typing
      const aggregationPipeline: PipelineStage[] = [
        {
          $facet: {
            directIssues: [
              {
                $match: {
                  $and: [
                    { [`${entity}`]: entityId },
                    { isDeleted: { $ne: true } }
                  ]
                }
              },
              {
                $addFields: {
                  isAdopted: false,
                  adoptionStatus: null,
                  adoptionMessage: null,
                  proposedBy: null,
                  acceptedBy: null,
                  adoptionId: null
                }
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'createdBy',
                  foreignField: '_id',
                  as: 'createdBy'
                }
              },
              {
                $unwind: {
                  path: '$createdBy',
                  preserveNullAndEmptyArrays: true
                }
              },
              {
                $project: {
                  'createdBy.password': 0
                }
              }
            ],
            adoptedIssues: [
              {
                $lookup: {
                  from: 'issuesadoptions',
                  let: { issueId: '$_id' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            { $eq: [`$${entity}`, entityId] },
                            { $ne: ['$status', 'rejected'] }
                          ]
                        }
                      }
                    }
                  ],
                  as: 'adoption'
                }
              },
              {
                $unwind: '$adoption'
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'createdBy',
                  foreignField: '_id',
                  as: 'createdBy'
                }
              },
              {
                $unwind: {
                  path: '$createdBy',
                  preserveNullAndEmptyArrays: true
                }
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'adoption.proposedBy',
                  foreignField: '_id',
                  as: 'proposedBy'
                }
              },
              {
                $unwind: {
                  path: '$proposedBy',
                  preserveNullAndEmptyArrays: true
                }
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'adoption.acceptedBy',
                  foreignField: '_id',
                  as: 'acceptedBy'
                }
              },
              {
                $unwind: {
                  path: '$acceptedBy',
                  preserveNullAndEmptyArrays: true
                }
              },
              {
                $addFields: {
                  isAdopted: true,
                  adoptionStatus: '$adoption.status',
                  adoptionMessage: '$adoption.message',
                  adoptionId: '$adoption._id'
                }
              },
              {
                $project: {
                  'createdBy.password': 0,
                  'proposedBy.password': 0,
                  'acceptedBy.password': 0,
                  adoption: 0
                }
              }
            ]
          }
        } as PipelineStage,
        {
          $project: {
            allIssues: {
              $concatArrays: ['$directIssues', '$adoptedIssues']
            }
          }
        },
        {
          $unwind: '$allIssues'
        },
        {
          $sort: { 'allIssues.createdAt': -1 }
        },
        {
          $skip: skip
        },
        {
          $limit: validLimit
        },
        {
          $group: {
            _id: null,
            issues: { $push: '$allIssues' }
          }
        }
      ];

      const countPipeline: PipelineStage[] = [
        {
          $facet: {
            directCount: [
              {
                $match: {
                  $and: [
                    { [`${entity}`]: entityId },
                    { isDeleted: { $ne: true } }
                  ]
                }
              },
              {
                $count: 'count'
              }
            ],
            adoptedCount: [
              {
                $lookup: {
                  from: 'issuesadoptions',
                  pipeline: [
                    {
                      $match: {
                        $and: [
                          { [`${entity}`]: entityId },
                          { status: { $ne: 'rejected' } }
                        ]
                      }
                    },
                    {
                      $count: 'count'
                    }
                  ],
                  as: 'adoptedCount'
                }
              },
              {
                $unwind: {
                  path: '$adoptedCount',
                  preserveNullAndEmptyArrays: true
                }
              },
              {
                $group: {
                  _id: null,
                  count: { $sum: '$adoptedCount.count' }
                }
              }
            ]
          }
        }
      ];

      // Execute both pipelines
      const [results, countResults] = await Promise.all([
        this.issuesModel.aggregate(aggregationPipeline),
        this.issuesModel.aggregate(countPipeline)
      ]);

      // Calculate total count
      const directCount = countResults[0]?.directCount[0]?.count || 0;
      const adoptedCount = countResults[0]?.adoptedCount[0]?.count || 0;
      const totalCount = directCount + adoptedCount;
      const totalPages = Math.ceil(totalCount / validLimit);

      return {
        issues: results[0]?.issues || [],
        pagination: {
          currentPage: validPage,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: validLimit,
          hasNextPage: validPage < totalPages,
          hasPreviousPage: validPage > 1
        }
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while getting issues and adoptions',
        error,
      );
    }
  }
  /**
   * Returns all active issues created by the given user for a given entity
   * @param userId - The id of the user
   * @param entity - The type of entity. It can be either 'node' or 'club'
   * @param entityId - The id of the entity
   * @returns An array of active issues
   */
  async getMyIssues(
    userId: Types.ObjectId,
    entity: 'node' | 'club',
    entityId: Types.ObjectId,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      // Ensure page and limit are positive numbers
      const validPage = Math.max(1, page);
      const validLimit = Math.max(1, limit);
      const skip = (validPage - 1) * validLimit;

      // Construct the query based on entity type
      const query = {
        createdBy: userId,
        [entity]: entityId,
      };

      // Get total count for pagination metadata
      const totalCount = await this.issuesModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / validLimit);

      // Get paginated results
      const issues = await this.issuesModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(validLimit)
        .exec();

      // Return both the data and pagination metadata
      return {
        issues,
        pagination: {
          currentPage: validPage,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: validLimit,
          hasNextPage: validPage < totalPages,
          hasPreviousPage: validPage > 1
        }
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while getting active rules-regulations',
        error,
      );
    }
  }

  async getGlobalActiveIssues(page: number = 1, limit: number = 10) {
    try {
      // Ensure page and limit are positive numbers
      const validPage = Math.max(1, page);
      const validLimit = Math.max(1, limit);
      const skip = (validPage - 1) * validLimit;

      // Define the base query
      const query = {
        isActive: true,
        publishedStatus: 'published',
      };

      // Get total count for pagination metadata
      const totalCount = await this.issuesModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / validLimit);

      // Get paginated results with populated fields
      const issues = await this.issuesModel
        .find(query)
        .populate('createdBy', '-password')
        .populate('node')
        .populate('club')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(validLimit)
        .exec();

      // Return both the data and pagination metadata
      return {
        issues,
        pagination: {
          currentPage: validPage,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: validLimit,
          hasNextPage: validPage < totalPages,
          hasPreviousPage: validPage > 1
        }
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while getting active rules-regulations',
        error,
      );
    }
  }

  async getIssue(issueId: Types.ObjectId) {
    try {
      const response = await this.issuesModel
        .findById(issueId)
        .populate('createdBy', '-password')
        .populate('whoShouldAddress')
        .populate('node')
        .populate('club')
        .sort({ createdAt: -1 })
        .exec();

      return response;
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while getting specific issue',
        error,
      );
    }
  }



  async getMemberRoles(userId: Types.ObjectId, createIssuesData: any) {
    try {
      if (createIssuesData.node) {
        const memberInfo = await this.nodeMembersModel.findOne({
          node: new Types.ObjectId(createIssuesData.node),
          user: new Types.ObjectId(userId),
        });
        return memberInfo.role;
      }

      const memberInfo = await this.clubMembersModel.findOne({
        club: new Types.ObjectId(createIssuesData.club),
        user: new Types.ObjectId(userId),
      });
      return memberInfo.role;
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while getting user roles',
        error,
      );
    }
  }

  async adoptIssueAndPropose(userId: Types.ObjectId, adoptForumDto
    : { issues: Types.ObjectId, node?: Types.ObjectId, club?: Types.ObjectId, proposalMessage: string }) {
    try {

      console.log({ adoptForumDto })
      // check if previously issue is there or not 
      const isAdopted = await this.issueAdoptionModel.findOne({
        issues: new Types.ObjectId(adoptForumDto.issues),
        status: { $in: ['published', 'proposed'] },
        $or: [
          // If node is provided, check for the same node
          ...(adoptForumDto.node ? [{ node: new Types.ObjectId(adoptForumDto.node) }] : []),
          // If club is provided, check for the same club
          ...(adoptForumDto.club ? [{ club: new Types.ObjectId(adoptForumDto.club) }] : [])
        ]
      });

      if (isAdopted) {
        const forumType = isAdopted.node ? 'node' : 'club';
        throw new BadRequestException(
          `Issue is already ${isAdopted.status === 'published' ? 'adopted' : 'under proposal'} in this ${forumType}`
        );
      }

      if (adoptForumDto.club && adoptForumDto.node) {
        throw new BadRequestException(
          'Forum must be either club or node, not both',
        );
      }
      console.log({ userId });

      let userDetails;
      if (adoptForumDto.club) {
        // Check role for club
        userDetails = await this.clubMembersModel.findOne({
          user: new Types.ObjectId(userId),
          club: new Types.ObjectId(adoptForumDto.club),
        });

      } else if (adoptForumDto.node) {
        // Check role for node
        userDetails = await this.nodeMembersModel.findOne({
          user: new Types.ObjectId(userId),
          node: new Types.ObjectId(adoptForumDto.node),
        });
      }

      if (!userDetails) {
        throw new NotAcceptableException(
          'User not found in the specified forum',
        );
      }


      const adoptionData = {

        issues: new Types.ObjectId(adoptForumDto.issues),

        proposedBy: new Types.ObjectId(userId),
        ...(userDetails.role !== 'member' && {
          acceptedBy: new Types.ObjectId(userId),
        }),

        ...(userDetails.role === 'member' && {
          message: adoptForumDto.proposalMessage,  // Add message for members
        }),

        status: userDetails.role === 'member' ? 'proposed' : 'published',

        node: adoptForumDto.node
          ? new Types.ObjectId(adoptForumDto.node)
          : null,

        club: adoptForumDto.club
          ? new Types.ObjectId(adoptForumDto.club)
          : null,
      };

      // Create adoption record
      const adoptedIssue =
        await this.issueAdoptionModel.create(adoptionData);


      return {
        success: true,
        data: adoptedIssue,
        message: 'Issue adopted successfully',
      };
    } catch (error) {
      throw new NotAcceptableException('Failed to adopt forum');
    }

  }

  async adoptProposedIssue(userId: Types.ObjectId, issueId) {
    try {
      // First get the issue data
      const issues = await this.issuesModel.findById(issueId);
      if (!issues) {
        throw new NotFoundException('Issue not found');
      }

      // Prepare update operations
      const updatePromises = [];

      // Main issue update
      const mainUpdate = this.issuesModel.findByIdAndUpdate(issueId, {
        publishedStatus: 'published',
        publishedBy: userId,
        publishedDate: new Date(),
        isActive: true,
      });
      updatePromises.push(mainUpdate);

      // Only add these updates if there's an adoptedFrom reference
      if (issues.adoptedFrom) {
        if (issues.club) {
          const clubUpdate = this.issuesModel.findByIdAndUpdate(
            issues.adoptedFrom,
            {
              $addToSet: {
                adoptedClubs: { club: issues.club, date: new Date() },
              },
            },
            { new: true },
          );
          updatePromises.push(clubUpdate);
        }

        if (issues.node) {
          const nodeUpdate = this.issuesModel.findByIdAndUpdate(
            issues.adoptedFrom,
            {
              $addToSet: {
                adoptedNodes: { node: issues.node, date: new Date() },
              },
            },
            { new: true },
          );
          updatePromises.push(nodeUpdate);
        }
      }

      // Execute all updates concurrently
      const [updatedIssue] = await Promise.all(updatePromises);

      return {
        status: true,
        message: 'Issue adopted successfully',
        issues: updatedIssue,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error while adopting issue',
        error,
      );
    }
  }

  async getProposedIssues(entity, entityId: Types.ObjectId) {
    try {
      if (entity === 'node') {
        return await this.issuesModel
          .find({ node: entityId, publishedStatus: 'proposed' })
          .populate('createdBy', '-password').sort({ createdAt: -1 })
          .exec();
      } else {
        return await this.issuesModel
          .find({ club: entityId, publishedStatus: 'proposed' })
          .populate('createdBy', '-password').sort({ createdAt: -1 })
          .exec();
      }
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while getting proposed issues',
        error,
      );
    }
  }

  /**
   * Like an issue.
   * @param userId The id of the user to like the issue for
   * @param issueId The id of the issue to like
   * @throws `BadRequestException` if the issueId is invalid
   * @throws `NotFoundException` if the issue is not found
   * @throws `InternalServerErrorException` if there is an error while liking the issue
   * @returns The updated issue document
   */
  async likeIssue(userId: Types.ObjectId, issueId: Types.ObjectId) {
    try {
      if (!issueId) {
        throw new NotFoundException('IssueId not found');
      }

      const issue = await this.issuesModel.findById(issueId);
      if (!issue) {
        throw new NotFoundException('Issue not found');
      }

      const alreadyLiked = issue.relevant.some((like) =>
        like.user.equals(userId),
      );

      if (alreadyLiked) {
        return await this.issuesModel.findByIdAndUpdate(
          issueId,
          { $pull: { relevant: { user: userId } } },
          { new: true },
        );
      }

      return await this.issuesModel.findByIdAndUpdate(
        issueId,
        {
          $addToSet: { relevant: { user: userId, date: new Date() } },
          $pull: { irrelevant: { user: userId } },
        },
        { new: true },
      );
    } catch (error) {

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error while adopting issue',
        error,
      );
    }
  }

  /**
   * Dislike an issue.
   * @param userId The id of the user to dislike the issue for
   * @param issueId The id of the issue to dislike
   * @throws `BadRequestException` if the issueId is invalid
   * @throws `NotFoundException` if the issue is not found
   * @throws `InternalServerErrorException` if there is an error while disliking the issue
   * @returns The updated issue document
   */
  async dislikeIssue(userId: Types.ObjectId, issueId: Types.ObjectId) {
    try {
      if (!issueId) {
        throw new NotFoundException('IssueId not found');
      }

      const issue = await this.issuesModel.findById(issueId);
      if (!issue) {
        throw new NotFoundException('Issue not found');
      }

      const alreadyDisliked = issue.irrelevant.some((dislike) =>
        dislike.user.equals(userId),
      );

      if (alreadyDisliked) {
        return await this.issuesModel.findByIdAndUpdate(
          issueId,
          { $pull: { irrelevant: { user: userId } } },
          { new: true },
        );
      }

      return await this.issuesModel.findByIdAndUpdate(
        issueId,
        {
          $addToSet: { irrelevant: { user: userId, date: new Date() } },
          $pull: { relevant: { user: userId } },
        },
        { new: true },
      );
    } catch (error) {

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error while adopting issue',
        error,
      );
    }
  }


  async getClubsNodesNotAdopted(
    userId: Types.ObjectId,
    issueId: Types.ObjectId,
  ) {
    try {
      if (!issueId) {
        throw new NotFoundException('IssueId not found');
      }

      const issue = await this.issuesModel.findById(
        new Types.ObjectId(issueId),
      );

      if (!issue) {
        throw new NotFoundException('Issue not found');
      }

      const rootParent = issue.rootParent ?? new Types.ObjectId(issueId);

      // Nodes Aggregation Pipeline
      const nodesAggregation = [
        {
          $match: {
            user: userId,
          },
        },
        {
          $lookup: {
            from: 'node_',
            localField: 'node',
            foreignField: '_id',
            as: 'nodeDetails',
          },
        },
        {
          $unwind: '$nodeDetails',
        },
        {
          $lookup: {
            from: 'issues',
            let: { nodeId: '$node' },
            pipeline: [
              {
                $match: {
                  $or: [
                    { _id: new Types.ObjectId(issueId) },
                    { rootParent: rootParent },
                  ],
                  $expr: {
                    $not: {
                      $in: ['$$nodeId', '$adoptedNodes.node'],
                    },
                  },
                },
              },
            ],
            as: 'unadoptedIssues',
          },
        },
        {
          $match: {
            unadoptedIssues: { $ne: [] },
          },
        },
        {
          $addFields: {
            "nodeDetails.role": "$role"
          },
        },
        {
          $replaceRoot: {
            newRoot: '$nodeDetails',
          },
        },
      ];

      // Clubs Aggregation Pipeline
      const clubsAggregation = [
        {
          $match: {
            user: userId,
          },
        },
        {
          $lookup: {
            from: 'clubs',
            localField: 'club',
            foreignField: '_id',
            as: 'clubDetails',
          },
        },
        {
          $unwind: '$clubDetails',
        },
        {
          $lookup: {
            from: 'issues',
            let: { clubId: '$club' },
            pipeline: [
              {
                $match: {
                  $or: [
                    { _id: new Types.ObjectId(issueId) },
                    { rootParent: rootParent },
                  ],
                  $expr: {
                    $not: {
                      $in: ['$$clubId', '$adoptedClubs.club'],
                    },
                  },
                },
              },
            ],
            as: 'unadoptedIssues',
          },
        },
        {
          $match: {
            unadoptedIssues: { $ne: [] },
          },
        },
        {
          $addFields: {
            "clubDetails.role": "$role"
          },
        },
        {
          $replaceRoot: {
            newRoot: '$clubDetails',
          },
        },
      ];

      // Run both aggregations concurrently
      const [memberNodes, memberClubs] = await Promise.all([
        this.nodeMembersModel.aggregate(nodesAggregation),
        this.clubMembersModel.aggregate(clubsAggregation),
      ]);

      return {
        clubs: memberClubs,
        nodes: memberNodes,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error while getting clubs and nodes not adopted',
        error,
      );
    }
  }

  async createSolution(userId: Types.ObjectId, createSolutionDto: CreateSolutionDto) {
    try {
      console.log({ userId, createSolutionDto });
      let isAdminOrModerator = null;

      // checking the user is admin or moderator
      if (createSolutionDto.forum === "node") {
        isAdminOrModerator = await this.nodeMembersModel.findOne({
          user: new Types.ObjectId(userId),
          status: 'MEMBER',
          node: createSolutionDto.forumId,
          role: { $in: ['admin', 'moderator'] }
        });
      } else if (createSolutionDto.forum === 'club') {
        isAdminOrModerator = await this.nodeMembersModel.findOne({
          user: new Types.ObjectId(userId),
          status: 'MEMBER',
          club: createSolutionDto.forumId,
          role: { $in: ['admin', 'moderator'] }
        });
      } else {
        throw new BadRequestException('forum is required');
      }

      if (!isAdminOrModerator) {
        throw new UnauthorizedException('Only admins and moderators can mark solutions');
      }

      const createdSolution = await this.issuesModel.findByIdAndUpdate(
        new Types.ObjectId(createSolutionDto.postId),
        {
          $push: {
            solutions: {
              comment: new Types.ObjectId(createSolutionDto.commentId),
              creator: userId,
              date: new Date()
            }
          }
        },
        { new: true }
      );

      if (!createdSolution) {
        throw new NotFoundException('Issue not found');
      }

      return { data: createdSolution, message: 'solution created', success: true };
    } catch (error) {
      console.log({ error })
      throw new BadRequestException(error);
    }
  }

  //handling file uploads
  private async uploadFile(file: Express.Multer.File) {
    try {
      //uploading file
      const response = await this.s3FileUpload.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        'club',
      );
      return response;
    } catch (error) {
      throw new BadRequestException(
        'Failed to upload file. Please try again later.',
      );
    }
  }
}
