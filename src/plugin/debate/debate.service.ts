import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PipelineStage } from 'mongoose';

import { InjectModel } from '@nestjs/mongoose';
import { Model, StringExpression, Types } from 'mongoose';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';
import { Debate } from 'src/shared/entities/debate.entity';
import { NodeMembers } from 'src/shared/entities/node-members.entity';
import { UploadService } from 'src/shared/upload/upload.service';
import { CreateDebateDto } from './dto/create.dto';
import { DebateArgument } from 'src/shared/entities/debate-argument';
import { CreateDebateArgumentDto } from './dto/argument.dto';
import { DebatesResponse } from 'typings';
import { DebateAdoption } from 'src/shared/entities/debate/debate-adoption-entity';
import { query } from 'express';
@Injectable()
export class DebateService {
  constructor(
    @InjectModel(Debate.name) private debateModel: Model<Debate>,
    @InjectModel(ClubMembers.name) private clubMembersModel: Model<ClubMembers>,
    @InjectModel(NodeMembers.name) private nodeMembersModel: Model<NodeMembers>,
    @InjectModel(DebateArgument.name)
    private debateArgumentModel: Model<DebateArgument>,
    @InjectModel(DebateAdoption.name) private debateAdoptionModel: Model<DebateAdoption>,
    private readonly s3FileUpload: UploadService,
  ) { }
  async createDebate(createDebateDto, userId: string) {
    try {
      const {
        publishedStatus: requestedStatus,
        files,
        club,
        node,
        closingDate,
        tags,
        startingComment,
        ...rest
      } = createDebateDto;

      const parsedTags = JSON.parse(tags);

      // Ensure either club or node is provided, not both
      if (!club && !node) {
        throw new BadRequestException('Either club or node must be provided.');
      }
      if (club && node) {
        throw new BadRequestException(
          'Provide only one of club or node, not both.',
        );
      }

      const section = club ? 'club' : 'node';
      const sectionId = club || node;

      const uploadPromises = files?.map((file: any) =>
        this.uploadFile(
          {
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype,
          } as Express.Multer.File,
          section,
        ),
      );

      const uploadedFiles = await Promise.all(uploadPromises);

      const fileObjects = uploadedFiles.map((uploadedFile, index) => ({
        url: uploadedFile.url,
        originalname: files[index].originalName,
        mimetype: files[index].mimetype,
        size: files[index].size,
      }));

      const getMember = async () => {
        if (section === 'club') {
          return this.clubMembersModel.findOne({
            club: new Types.ObjectId(sectionId),
            user: userId,
          });
        }
        return this.nodeMembersModel.findOne({
          node: new Types.ObjectId(sectionId),
          user: userId,
        });
      };

      const member = await getMember();

      if (!member) {
        throw new NotFoundException(`User is not a member of the ${section}`);
      }

      let publishedStatus: 'draft' | 'published' | 'proposed' = 'proposed';
      let publishedBy: string | null = null;

      if (['admin', 'moderator', 'owner'].includes(member.role)) {
        publishedStatus = requestedStatus === 'draft' ? 'draft' : 'published';
        if (publishedStatus === 'published') {
          publishedBy = userId;
        }
      }

      if (!['draft', 'published', 'proposed'].includes(publishedStatus)) {
        throw new BadRequestException('Invalid published status');
      }

      const debate = new this.debateModel({
        ...rest,
        startingComment,
        node: section === 'node' ? new Types.ObjectId(sectionId) : null,
        club: section === 'club' ? new Types.ObjectId(sectionId) : null,
        closingDate,
        tags: parsedTags,
        createdBy: userId,
        publishedStatus,
        publishedBy,
        files: fileObjects,
        createdAt: new Date(),
      });

      const savedDebate = await debate.save();

      // Save the opening comments in the DebateArgument collection

      const statusMessages = {
        draft: 'Debate saved as draft successfully.',
        proposed: 'Debate proposed successfully.',
        published: 'Debate published successfully.',
      } as const;

      return {
        message: statusMessages[publishedStatus],
      };
    } catch (error) {

      console.error('Debate creation error:', error);
      throw error;
    }
  }

  async adoptDebate(dataToSave: {
    type: 'club' | 'node';
    debateId: Types.ObjectId;
    clubId?: Types.ObjectId;
    nodeId?: Types.ObjectId;
    userId: Types.ObjectId;
  }) {
    try {
      // Fetch the user's membership details based on the type
      let member;
      if (dataToSave.type === 'club') {
        if (!dataToSave.clubId) {
          throw new BadRequestException(
            'Club ID is required for club adoption',
          );
        }
        member = await this.clubMembersModel.findOne({
          club: new Types.ObjectId(dataToSave.clubId),
          user: new Types.ObjectId(dataToSave.userId),
        });
      } else if (dataToSave.type === 'node') {
        if (!dataToSave.nodeId) {
          throw new BadRequestException(
            'Node ID is required for node adoption',
          );
        }
        member = await this.nodeMembersModel.findOne({
          node: new Types.ObjectId(dataToSave.nodeId),
          user: new Types.ObjectId(dataToSave.userId),
        });
      }

      if (!member) {
        throw new NotFoundException(
          `User is not a member of the specified ${dataToSave.type}`,
        );
      }

      const isAuthorized = ['admin', 'moderator', 'owner'].includes(
        member.role,
      );

      // Fetch the existing debate
      const existingDebate = await this.debateModel.findById(
        new Types.ObjectId(dataToSave.debateId),
      );

      if (!existingDebate) {
        throw new NotFoundException('Debate not found');
      }

      // Check if an adoption already exists
      const existingAdoption = await this.debateAdoptionModel.findOne({
        debate: new Types.ObjectId(dataToSave.debateId),
        ...(dataToSave.type === 'club'
          ? { club: new Types.ObjectId(dataToSave.clubId) }
          : { node: new Types.ObjectId(dataToSave.nodeId) }),
      });

      if (existingAdoption) {
        return {
          message: 'This debate is already adopted or has a pending adoption request',
          data: existingAdoption,
        };
      }

      // Create new adoption record
      const adoptionData = {
        proposedBy: new Types.ObjectId(dataToSave.userId),
        debate: new Types.ObjectId(dataToSave.debateId),
        club: dataToSave.type === 'club' ? new Types.ObjectId(dataToSave.clubId) : undefined,
        node: dataToSave.type === 'node' ? new Types.ObjectId(dataToSave.nodeId) : undefined,

        status: isAuthorized ? 'published' : 'proposed',
        type: 'adopted',
      };

      if (isAuthorized) {
        adoptionData['acceptedBy'] = new Types.ObjectId(dataToSave.userId);
      }

      const newAdoption = new this.debateAdoptionModel(adoptionData);
      const savedAdoption = await newAdoption.save();

      if (isAuthorized) {
        // Update the debate's adoption information
        await this.debateModel.findByIdAndUpdate(
          dataToSave.debateId,
          {
            $addToSet: {
              [dataToSave.type === 'club' ? 'adoptedClubs' : 'adoptedNodes']: {
                [dataToSave.type]: dataToSave.type === 'club' ? dataToSave.clubId : dataToSave.nodeId,
                date: new Date(),
              },
            },
          },
          { new: true },
        );
      }

      return {
        message: isAuthorized
          ? 'Debate adopted and published successfully'
          : 'Debate adoption proposed for review',
        data: savedAdoption,
      };
    } catch (error) {
      console.error('Adoption error:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error while adopting debate',
        error.message,
      );
    }
  }




  async myDebates({
    entity,
    userId,
    entityId,
    page = 1,
    limit = 10,
  }: {
    entity: 'club' | 'node';
    userId: string;
    entityId: string;
    page?: number;
    limit?: number;
  }): Promise<DebatesResponse> {
    try {
      const skip = (page - 1) * limit;

      const pipeline: PipelineStage[] = [
        // Match stage for initial filtering
        {
          $match: {
            $and: [
              { createdBy: new Types.ObjectId(userId) },
              { [entity]: new Types.ObjectId(entityId) },
              { publishedStatus: { $in: ['published', 'draft', 'proposed'] } }
            ]
          }
        },

        // Lookup adopted debates
        {
          $unionWith: {
            coll: 'debateadoptions',
            pipeline: [
              {
                $match: {
                  proposedBy: new Types.ObjectId(userId),
                  [entity]: new Types.ObjectId(entityId),
                  status: { $in: ['published', 'draft', 'proposed'] }
                }
              },
              {
                $lookup: {
                  from: 'debates',
                  localField: 'debate',
                  foreignField: '_id',
                  as: 'debateDetails'
                }
              },
              { $unwind: '$debateDetails' },
              {
                $replaceRoot: {
                  newRoot: {
                    $mergeObjects: [
                      '$debateDetails',
                      {
                        isAdopted: true,
                        adoptionStatus: '$status',
                        adoptedDate: '$createdAt'
                      }
                    ]
                  }
                }
              }
            ]
          }
        },

        // Lookup creator details
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'creator'
          }
        },
        { $unwind: '$creator' },

        // Lookup arguments
        {
          $lookup: {
            from: 'debatearguments',
            let: { debateId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$debate', '$$debateId'] }
                }
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'participant.user',
                  foreignField: '_id',
                  as: 'participant.userDetails'
                }
              },
              { $unwind: '$participant.userDetails' }
            ],
            as: 'allArguments'
          }
        },

        // Facet for pagination and total count
        {
          $facet: {
            data: [
              {
                $addFields: {
                  args: {
                    for: {
                      $filter: {
                        input: '$allArguments',
                        as: 'arg',
                        cond: { $eq: ['$$arg.participant.side', 'support'] }
                      }
                    },
                    against: {
                      $filter: {
                        input: '$allArguments',
                        as: 'arg',
                        cond: { $eq: ['$$arg.participant.side', 'against'] }
                      }
                    }
                  }
                }
              },
              { $unset: 'allArguments' },
              { $sort: { createdAt: -1 } },
              { $skip: skip },
              { $limit: limit }
            ],
            totalCount: [{ $count: 'count' }]
          }
        }
      ];

      const [result] = await this.debateModel.aggregate(pipeline);

      if (!result.data || result.data.length === 0) {
        throw new NotFoundException('No debates found for the given criteria.');
      }

      const totalCount = result.totalCount[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        message: 'Debates fetched successfully.',
        data: result.data,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalCount,
        },
      };
    } catch (error) {
      console.error('Error fetching debates:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error while fetching debates.',
        error.message,
      );
    }
  }

  // Fetch ongoing public global debates (not expired)
  async getOngoingPublicGlobalDebates(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    data: any[];
    pagination: {
      total: number;
      currentPage: number;
      totalPages: number;
    }

  }> {
    try {
      // Calculate skip value for pagination
      const skip = (page - 1) * limit;

      // Get total count for pagination
      const totalDebates = await this.debateModel.countDocuments({
        publishedStatus: 'published',
        isPublic: true
      });

      // Fetch paginated debates
      const debates = await this.debateModel
        .find({ publishedStatus: 'published', isPublic: true })
        .populate('createdBy')
        .skip(skip)
        .limit(limit);

      // Fetch args for each debate and group by side
      const debateWithArguments = await Promise.all(
        debates.map(async (debate) => {
          const args = await this.debateArgumentModel
            .find({ debate: debate._id })
            .populate('participant.user', 'name')
            .lean();

          // Group args by side
          const forArguments = args.filter(
            (arg) => arg.participant.side === 'support',
          );
          const againstArguments = args.filter(
            (arg) => arg.participant.side === 'against',
          );

          return {
            ...debate.toObject(),
            args: {
              for: forArguments,
              against: againstArguments,
            },
          };
        }),
      );

      // Calculate total pages
      const totalPages = Math.ceil(totalDebates / limit);

      return {
        data: debateWithArguments,
        pagination: {
          total: totalDebates,
          currentPage: page,
          totalPages,
        }

      };
    } catch (error) {
      throw error;
    }
  }
  async myDebatesByStatus({
    entity,
    entityId,
    page = 1,
    limit = 10,
  }: {
    entity: 'club' | 'node';
    entityId?: string;
    page?: number;
    limit?: number;
  }): Promise<DebatesResponse> {
    try {
      const skip = (page - 1) * limit;

      const matchStage: PipelineStage.Match = {
        $match: {
          publishedStatus: 'published',
          ...(entityId && { [entity]: new Types.ObjectId(entityId) })
        }
      };

      const pipeline: PipelineStage[] = [
        // Initial match for regular debates
        matchStage,

        // Combine with adopted debates
        {
          $unionWith: {
            coll: 'debateadoptions',
            pipeline: [
              {
                $match: {
                  status: 'published',
                  ...(entityId && { [entity]: new Types.ObjectId(entityId) })
                }
              },
              {
                $lookup: {
                  from: 'debates',
                  localField: 'debate',
                  foreignField: '_id',
                  as: 'debateDetails'
                }
              },
              { $unwind: '$debateDetails' },
              {
                $match: {
                  'debateDetails.publishedStatus': 'published'
                }
              },
              {
                $replaceRoot: {
                  newRoot: {
                    $mergeObjects: [
                      '$debateDetails',
                      {
                        isAdopted: true,
                        adoptionStatus: '$status',
                        adoptedDate: '$createdAt'
                      }
                    ]
                  }
                }
              }
            ]
          }
        },

        // Lookup creator details
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'creatorDetails'
          }
        },
        { $unwind: '$creatorDetails' },

        // Lookup debate arguments
        {
          $lookup: {
            from: 'debatearguments',
            let: { debateId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$debate', '$$debateId'] }
                }
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'participant.user',
                  foreignField: '_id',
                  as: 'participant.userDetails'
                }
              },
              { $unwind: '$participant.userDetails' }
            ],
            as: 'allArguments'
          }
        },

        // Use facet for pagination and counts
        {
          $facet: {
            data: [
              {
                $addFields: {
                  args: {
                    for: {
                      $filter: {
                        input: '$allArguments',
                        as: 'arg',
                        cond: { $eq: ['$$arg.participant.side', 'support'] }
                      }
                    },
                    against: {
                      $filter: {
                        input: '$allArguments',
                        as: 'arg',
                        cond: { $eq: ['$$arg.participant.side', 'against'] }
                      }
                    }
                  }
                }
              },
              { $unset: 'allArguments' },
              {
                $addFields: {
                  createdBy: '$creatorDetails',
                }
              },
              { $unset: 'creatorDetails' },
              { $sort: { createdAt: -1 } },
              { $skip: skip },
              { $limit: limit }
            ],
            totalCount: [{ $count: 'count' }]
          }
        }
      ];

      const [result] = await this.debateModel.aggregate(pipeline);

      if (!result.data || result.data.length === 0) {
        throw new NotFoundException('No debates found for the given criteria.');
      }

      const totalCount = result.totalCount[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        message: 'Debates fetched successfully.',
        data: result.data,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalCount,
        },
      };
    } catch (error) {
      console.error('Error fetching debates:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error while fetching debates.',
        error.message,
      );
    }
  }

  // async getOngoingDebatesForEntity({
  //   entityId,
  //   entityType,
  // }: {
  //   entityId: string;
  //   entityType: 'club' | 'node';
  // }) {
  //   try {
  //     const currentTime = new Date(); // Current date and time
  //     const query: any = {};

  //     // If entity is a club or node, filter by that entity
  //     if (entityType === 'club') {
  //       query.publishedStatus = 'published';
  //       query.club = new Types.ObjectId(entityId); // Use clubId for filtering
  //     } else if (entityType === 'node') {
  //       query.publishedStatus = 'published';

  //       query.node = new Types.ObjectId(entityId); // Use nodeId for filtering
  //     }

  //     // Fetch ongoing debates
  //     const ongoingDebates = await this.debateModel
  //       .find({
  //         ...query,
  //         createdAt: { $lte: currentTime }, // Debate has started (createdAt is used as the start time)
  //         closingDate: { $gt: currentTime }, // Debate is not yet closed (closingDate is used as the end time)
  //       })
  //       .populate('createdBy')
  //       .exec();

  //     // If no ongoing debates found, throw an exception
  //     if (!ongoingDebates || ongoingDebates.length === 0) {
  //       throw new NotFoundException(
  //         `No ongoing debates found for the ${entityType}.`,
  //       );
  //     }

  //     // Return the ongoing debates
  //     return {
  //       message: `Ongoing debates fetched successfully for the ${entityType}.`,
  //       data: ongoingDebates,
  //     };
  //   } catch (error) {
  //     console.error('Error fetching ongoing debates:', error);
  //     throw new Error(`Error while fetching ongoing debates: ${error.message}`);
  //   }
  // }

  async getOngoingDebatesForEntity({
    entityId,
    entityType,
    page = 1,
    limit = 10,
  }: {
    entityId: string;
    entityType: 'club' | 'node';
    page?: number;
    limit?: number;
  }): Promise<DebatesResponse> {
    try {
      // Input validation
      if (!entityId || !entityType) {
        throw new BadRequestException('Both entityId and entityType are required.');
      }
      if (page < 1 || limit < 1) {
        throw new BadRequestException('Page and limit must be positive numbers.');
      }
      if (!['club', 'node'].includes(entityType)) {
        throw new BadRequestException('Invalid entity type. Use "club" or "node".');
      }

      const currentTime = new Date();
      const skip = (page - 1) * limit;

      const pipeline: PipelineStage[] = [
        // Match stage for regular debates
        {
          $match: {
            publishedStatus: 'published',
            [entityType]: new Types.ObjectId(entityId),
            createdAt: { $lte: currentTime },
            closingDate: { $gt: currentTime }
          }
        },

        // Combine with adopted debates
        {
          $unionWith: {
            coll: 'debateadoptions',
            pipeline: [
              {
                $match: {
                  status: 'published',
                  [entityType]: new Types.ObjectId(entityId)
                }
              },
              {
                $lookup: {
                  from: 'debates',
                  localField: 'debate',
                  foreignField: '_id',
                  as: 'debateDetails'
                }
              },
              { $unwind: '$debateDetails' },
              {
                $match: {
                  'debateDetails.publishedStatus': 'published',
                  'debateDetails.createdAt': { $lte: currentTime },
                  'debateDetails.closingDate': { $gt: currentTime }
                }
              },
              {
                $replaceRoot: {
                  newRoot: {
                    $mergeObjects: [
                      '$debateDetails',
                      {
                        isAdopted: true,
                        adoptionStatus: '$status',
                        adoptedDate: '$createdAt'
                      }
                    ]
                  }
                }
              }
            ]
          }
        },

        // Lookup creator details
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'creatorDetails'
          }
        },
        { $unwind: '$creatorDetails' },

        // Lookup arguments
        {
          $lookup: {
            from: 'debatearguments',
            let: { debateId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$debate', '$$debateId'] }
                }
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'participant.user',
                  foreignField: '_id',
                  as: 'participant.userDetails'
                }
              },
              { $unwind: '$participant.userDetails' }
            ],
            as: 'allArguments'
          }
        },

        // Facet for pagination and counts
        {
          $facet: {
            data: [
              {
                $addFields: {
                  args: {
                    for: {
                      $filter: {
                        input: '$allArguments',
                        as: 'arg',
                        cond: { $eq: ['$$arg.participant.side', 'support'] }
                      }
                    },
                    against: {
                      $filter: {
                        input: '$allArguments',
                        as: 'arg',
                        cond: { $eq: ['$$arg.participant.side', 'against'] }
                      }
                    }
                  }
                }
              },
              { $unset: 'allArguments' },
              {
                $addFields: {
                  createdBy: '$creatorDetails',
                }
              },
              { $unset: 'creatorDetails' },
              { $sort: { createdAt: -1 } },
              { $skip: skip },
              { $limit: limit }
            ],
            totalCount: [{ $count: 'count' }]
          }
        }
      ];

      const [result] = await this.debateModel.aggregate(pipeline);

      if (!result.data || result.data.length === 0) {
        throw new NotFoundException(
          `No ongoing debates found for the ${entityType}.`
        );
      }

      const totalCount = result.totalCount[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        message: `Ongoing debates fetched successfully for the ${entityType}.`,
        data: result.data,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalCount,
        },
      };
    } catch (error) {
      console.error('Error fetching ongoing debates:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error while fetching ongoing debates: ${error.message}`
      );
    }
  }

  async publishDebate(
    debateId: string,
    userId: string,
    entityId: string,
    entityType: 'node' | 'club',
  ): Promise<Debate> {
    try {
      // Find the debate by ID
      const debate = await this.debateModel.findById(debateId);
      if (!debate) {
        throw new NotFoundException('Debate not found.');
      }

      // Check if the entity type and ID match the debate's club or node
      if (
        (entityType === 'node' && !debate.node?.equals(entityId)) ||
        (entityType === 'club' && !debate.club?.equals(entityId))
      ) {
        throw new UnauthorizedException(
          'This debate does not belong to the specified entity.',
        );
      }

      // Check if the user is authorized to publish the debate
      const membershipModel: any =
        entityType === 'node' ? this.nodeMembersModel : this.clubMembersModel;

      const membership = await membershipModel.findOne({
        [entityType]: new Types.ObjectId(entityId),
        user: new Types.ObjectId(userId),
        role: 'admin', // Only admins can publish debates
        status: 'MEMBER',
      });

      if (!membership) {
        throw new UnauthorizedException(
          'You are not authorized to publish this debate.',
        );
      }

      // Update the debate's publishedStatus and publishedBy
      debate.publishedStatus = 'published';
      debate.publishedBy = new Types.ObjectId(userId);
      await debate.save();

      return debate;
    } catch (error) {
      throw error; // Let the caller handle errors
    }
  }

  async createViewsForRulesAndRegulations(
    userId: Types.ObjectId,
    debateId: Types.ObjectId,
  ) {
    try {
      // Check if the user has already viewed
      const existingDebate = await this.debateModel.findOne({
        _id: debateId,
        views: userId, // Direct match as `views` is an array of IDs
      });

      if (existingDebate) {
        return {
          message: 'User has already viewed this rules regulation',
          debate: existingDebate, // Return the existing debate data
        };
      }

      // Add userId to the views array if not already present
      const updatedDebate = await this.debateModel.findByIdAndUpdate(
        debateId,
        { $addToSet: { views: userId } }, // Ensures no duplicates
        { new: true }, // Return the updated document
      );

      if (!updatedDebate) {
        throw new NotFoundException('Rules regulation not found');
      }

      return { message: 'Viewed successfully', debate: updatedDebate };
    } catch (error) {
      console.error('Error while updating views:', error.message);

      throw new InternalServerErrorException(
        'Error while viewing rules-regulations',
      );
    }
  }

  async getNonAdoptedClubsAndNodes(userId: string, debateId: Types.ObjectId) {
    try {
      // Fetch the debate
      const sourceDebate = await this.debateModel
        .findById(debateId)
        .select('club node')
        .lean();

      if (!sourceDebate) {
        throw new NotFoundException('Debate not found');
      }

      // Fetch all clubs the user is part of
      const userClubs = await this.clubMembersModel
        .find({ user: new Types.ObjectId(userId), status: 'MEMBER' })
        .populate('club')
        .select('club role')
        .lean();

      const userClubIds = userClubs?.map((club) => club?.club?._id.toString());

      const userClubDetails = userClubs?.reduce((acc, club: any) => {
        acc[club?.club?._id.toString()] = {
          role: club.role,
          name: club.club.name,
          image: club.club.profileImage.url,
        };
        return acc;
      }, {});

      // Fetch all nodes the user is part of
      const userNodes = await this.nodeMembersModel
        .find({ user: new Types.ObjectId(userId), status: 'MEMBER' })
        .populate('node')
        .select('node role')
        .lean();

      const userNodeIds = userNodes?.map((node) => node?.node?._id.toString());
      const userNodeDetails = userNodes?.reduce((acc, node: any) => {
        acc[node?.node?._id.toString()] = {
          role: node?.role,
          name: node?.node?.name,
          image: node?.node?.profileImage.url,
        };
        return acc;
      }, {});

      // Find clubs that already have adoption requests for this debate
      const clubAdoptions = await this.debateAdoptionModel
        .find({
          debate: new Types.ObjectId(debateId),
          club: { $in: userClubIds.map((id) => new Types.ObjectId(id)) },
          status: { $in: ['published', 'proposed'] }, // Only consider active adoptions
        })
        .select('club')
        .lean();

      const clubIdsWithAdoption = clubAdoptions.map((d) => d?.club?.toString());

      // Find nodes that already have adoption requests for this debate
      const nodeAdoptions = await this.debateAdoptionModel
        .find({
          debate: new Types.ObjectId(debateId),
          node: { $in: userNodeIds.map((id) => new Types.ObjectId(id)) },
          status: { $in: ['published', 'proposed'] }, // Only consider active adoptions
        })
        .select('node')
        .lean();

      const nodeIdsWithAdoption = nodeAdoptions.map((d) => d?.node?.toString());

      // Filter out clubs that already have adoption requests
      // and the creator club
      const nonAdoptedClubs = userClubIds
        .filter(
          (clubId) =>
            !clubIdsWithAdoption.includes(clubId) &&
            clubId !== sourceDebate.club?.toString(),
        )
        .map((clubId) => ({
          clubId,
          role: userClubDetails[clubId].role,
          name: userClubDetails[clubId].name,
          image: userClubDetails[clubId].image,
        }));

      // Filter out nodes that already have adoption requests
      // and the creator node
      const nonAdoptedNodes = userNodeIds
        .filter(
          (nodeId) =>
            !nodeIdsWithAdoption.includes(nodeId) &&
            nodeId !== sourceDebate.node?.toString(),
        )
        .map((nodeId) => ({
          nodeId,
          role: userNodeDetails[nodeId].role,
          name: userNodeDetails[nodeId].name,
          image: userNodeDetails[nodeId].image,
        }));

      return {
        nonAdoptedClubs,
        nonAdoptedNodes,
      };
    } catch (error) {
      console.error('Error fetching non-adopted clubs and nodes:', error);
      throw new InternalServerErrorException('Failed to fetch data');
    }
  }

  async getDebateById(id: string): Promise<Debate> {
    try {
      const debate = await this.debateModel
        .findById(id)
        .populate('createdBy')
        .exec();
      if (!debate) {
        throw new NotFoundException('Debate not found');
      }
      return debate;
    } catch (error) { }
  }

  async createArgument(
    createDebateArgumentDto,
    file?: Express.Multer.File,
  ): Promise<DebateArgument> {
    const { userId, debateId, side, content } = createDebateArgumentDto;
    try {
      let image: { url?: string; mimetype?: string } = {};
      if (Array.isArray(file) && file.length > 0) {
        const uploadedFile = await this.s3FileUpload.uploadFile(
          file[0].buffer,
          file[0].originalname,
          file[0].mimetype,
          'comment',
        );
        if (uploadedFile) {
          image.url = uploadedFile.url;
          image.mimetype = file[0].mimetype;
        }
      }
      const newArgument = new this.debateArgumentModel({
        debate: new Types.ObjectId(debateId),
        image,
        participant: {
          user: new Types.ObjectId(userId),
          side: side,
        },
        content,
      });
      return newArgument.save();
    } catch (error) {
      throw error;
    }
  }
  async getArgumentsByDebate(debateId: string) {
    try {
      const debateArguments = await this.debateArgumentModel
        .find({
          debate: new Types.ObjectId(debateId),
        })
        .sort({ startingPoint: -1, isPinned: -1, pinnedAt: -1 })
        .populate('participant.user', 'userName profileImage')
        .exec();

      if (!debateArguments || debateArguments.length === 0) {
        throw new NotFoundException(
          `No args found for debate with ID ${debateId}`,
        );
      }

      return debateArguments;
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to fetch debate args',
        error.message,
      );
    }
  }

  async toggleVote(
    argumentId: string,
    userId: string,
    voteType: 'relevant' | 'irrelevant',
  ) {
    const userObjectId = new Types.ObjectId(userId);
    const opposite = voteType === 'relevant' ? 'irrelevant' : 'relevant';

    // First, ensure document exists and arrays are initialized
    const existingArgument = await this.debateArgumentModel.findByIdAndUpdate(
      argumentId,
      {
        $setOnInsert: {
          relevant: [],
          irrelevant: []
        }
      },
      {
        new: true,
        upsert: true
      }
    );

    if (!existingArgument) {
      throw new NotFoundException('Argument not found');
    }

    // Remove from opposite array in a separate operation
    await this.debateArgumentModel.findByIdAndUpdate(
      argumentId,
      {
        $pull: {
          [opposite]: { user: userObjectId }
        }
      }
    );

    // Check current state
    const argument = await this.debateArgumentModel.findById(argumentId);
    if (!argument) {
      throw new NotFoundException('Argument not found');
    }

    const isInTarget = argument[voteType]?.some(entry =>
      entry.user.equals(userObjectId)
    ) || false;

    // Toggle the vote in a separate operation
    let updateOperation;
    if (isInTarget) {
      updateOperation = {
        $pull: {
          [voteType]: { user: userObjectId }
        }
      };
    } else {
      updateOperation = {
        $addToSet: {
          [voteType]: {
            user: userObjectId,
            date: new Date()
          }
        }
      };
    }

    // Perform the final update
    const updatedArgument = await this.debateArgumentModel.findByIdAndUpdate(
      argumentId,
      updateOperation,
      { new: true }
    );

    return updatedArgument;
  }
  async getProposedDebatesByEntityWithAuthorization(
    entity: 'club' | 'node',
    entityId: string,
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    try {
      // Validate entity ID
      if (!Types.ObjectId.isValid(entityId)) {
        throw new NotFoundException(`Invalid ${entity} ID`);
      }

      // Validate pagination parameters
      if (page < 1 || limit < 1) {
        throw new BadRequestException('Invalid pagination parameters');
      }

      // Calculate skip value for pagination
      const skip = (page - 1) * limit;

      // Determine which model to use based on entity
      const membershipModel: any =
        entity === 'club' ? this.clubMembersModel : this.nodeMembersModel;

      // Check if the user is an admin of the entity
      const query =
        entity === 'club'
          ? {
            club: new Types.ObjectId(entityId),
            user: new Types.ObjectId(userId),
          }
          : {
            node: new Types.ObjectId(entityId),
            user: new Types.ObjectId(userId),
          };

      const member = await membershipModel.findOne(query).exec();

      if (!member || !['admin', 'moderator', 'owner'].includes(member.role)) {
        throw new ForbiddenException(
          `You do not have permission to access adopted proposed entities for this ${entity}`,
        );
      }

      // Fetch proposed debates for the entity with pagination
      const filter =
        entity === 'club'
          ? { club: new Types.ObjectId(entityId), publishedStatus: 'proposed' }
          : { node: new Types.ObjectId(entityId), publishedStatus: 'proposed' };

      // Get total count for pagination metadata
      const totalCount = await this.debateModel.countDocuments(filter);
      const totalPages = Math.ceil(totalCount / limit);

      // If no debates found, throw NotFoundException
      if (totalCount === 0) {
        throw new NotFoundException(
          `No proposed debates found for this ${entity}`,
        );
      }

      // If requested page exceeds total pages, throw BadRequestException
      if (page > totalPages) {
        throw new BadRequestException(
          `Page ${page} exceeds total number of pages (${totalPages})`,
        );
      }

      // Fetch paginated debates
      const debates = await this.debateModel
        .find(filter)
        .populate('createdBy')
        .skip(skip)
        .limit(limit)
        .exec();

      // Return paginated response
      return {
        data: debates,
        metadata: {
          currentPage: page,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };

    } catch (error) {
      console.error(`Error fetching proposed debates for ${entity}:`, error);
      throw error;
    }
  }


  async acceptDebate(
    debateId: string,
    type: string,
    userId: Types.ObjectId
  ): Promise<Debate | DebateAdoption> {
    try {
      if (type === 'adopted') {
        // Find the adoption request first to check permissions
        const adoptionRequest = await this.debateAdoptionModel.findOne({
          debate: new Types.ObjectId(debateId),
          status: 'proposed'
        });

        if (!adoptionRequest) {
          throw new NotFoundException('Adoption request not found');
        }

        // Check member role for adoption
        let member;
        if (adoptionRequest.club) {
          member = await this.clubMembersModel.findOne({
            club: adoptionRequest.club,
            user: userId
          });
        } else if (adoptionRequest.node) {
          member = await this.nodeMembersModel.findOne({
            node: adoptionRequest.node,
            user: userId
          });
        }

        if (!member || !['admin', 'moderator', 'owner'].includes(member.role)) {
          throw new BadRequestException('Unauthorized: Only admins, moderators, or owners can accept adoptions');
        }

        // Update adoption status
        const updatedAdoption = await this.debateAdoptionModel.findByIdAndUpdate(
          adoptionRequest._id,
          {
            status: 'published',
            acceptedBy: userId
          },
          { new: true }
        );

        // Update the debate's adoption information
        await this.debateModel.findByIdAndUpdate(
          debateId,
          {
            $addToSet: {
              [updatedAdoption.club ? 'adoptedClubs' : 'adoptedNodes']: {
                [updatedAdoption.club ? 'club' : 'node']:
                  updatedAdoption.club || updatedAdoption.node,
                date: new Date()
              }
            }
          }
        );

        return updatedAdoption;
      } else {
        // For regular debate, first find the debate to check permissions
        const debate = await this.debateModel.findById(debateId);

        if (!debate) {
          throw new NotFoundException('Debate not found');
        }

        // Check member role for regular debate
        let member;
        if (debate.club) {
          member = await this.clubMembersModel.findOne({
            club: debate.club,
            user: userId
          });
        } else if (debate.node) {
          member = await this.nodeMembersModel.findOne({
            node: debate.node,
            user: userId
          });
        }

        if (!member || !['admin', 'moderator', 'owner'].includes(member.role)) {
          throw new BadRequestException('Unauthorized: Only admins, moderators, or owners can accept debates');
        }

        // Update debate status
        const updatedDebate = await this.debateModel.findByIdAndUpdate(
          new Types.ObjectId(debateId),
          {
            publishedStatus: 'published',
            publishedBy: userId
          },
          { new: true }
        );

        if (!updatedDebate) {
          throw new NotFoundException('Debate not found');
        }

        return updatedDebate;
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        error.message || 'An error occurred while accepting the debate'
      );
    }
  }



  async rejectDebate(
    debateId: string,
    type: string,
    userId: Types.ObjectId
  ): Promise<Debate | DebateAdoption> {
    try {
      if (type === 'adopted') {
        // Find the adoption request first to check permissions
        const adoptionRequest = await this.debateAdoptionModel.findOne({
          debate: new Types.ObjectId(debateId),
          status: 'proposed'
        });

        if (!adoptionRequest) {
          throw new NotFoundException('Adoption request not found');
        }

        // Check member role for adoption
        let member;
        if (adoptionRequest.club) {
          member = await this.clubMembersModel.findOne({
            club: adoptionRequest.club,
            user: userId
          });
        } else if (adoptionRequest.node) {
          member = await this.nodeMembersModel.findOne({
            node: adoptionRequest.node,
            user: userId
          });
        }

        if (!member || !['admin', 'moderator', 'owner'].includes(member.role)) {
          throw new BadRequestException('Unauthorized: Only admins, moderators, or owners can reject adoptions');
        }

        // Update adoption status
        const updatedAdoption = await this.debateAdoptionModel.findByIdAndUpdate(
          adoptionRequest._id,
          {
            status: 'rejected',
            acceptedBy: userId  // Using acceptedBy to track who rejected it
          },
          { new: true }
        );

        if (!updatedAdoption) {
          throw new NotFoundException('Adoption request not found');
        }

        return updatedAdoption;
      } else {
        // For regular debate, first find the debate to check permissions
        const debate = await this.debateModel.findById(debateId);

        if (!debate) {
          throw new NotFoundException('Debate not found');
        }

        // Check member role for regular debate
        let member;
        if (debate.club) {
          member = await this.clubMembersModel.findOne({
            club: debate.club,
            user: userId
          });
        } else if (debate.node) {
          member = await this.nodeMembersModel.findOne({
            node: debate.node,
            user: userId
          });
        }

        if (!member || !['admin', 'moderator', 'owner'].includes(member.role)) {
          throw new BadRequestException('Unauthorized: Only admins, moderators, or owners can reject debates');
        }

        // Update debate status
        const updatedDebate = await this.debateModel.findByIdAndUpdate(
          debateId,
          {
            publishedStatus: 'rejected',
            publishedBy: userId  // Using publishedBy to track who rejected it
          },
          { new: true }
        );

        if (!updatedDebate) {
          throw new NotFoundException('Debate not found');
        }

        return updatedDebate;
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        error.message || 'An error occurred while rejecting the debate'
      );
    }
  }
  async validateParticipation(
    userId: string,
    debateId: string,
    entityType: 'club' | 'node',
    entity: string,
  ): Promise<{ isAllowed: boolean; reason?: string }> {
    try {
      // Fetch the debate
      const debate = await this.debateModel.findById(debateId).lean();
      if (!debate) {
        return { isAllowed: false, reason: 'Debate not found' };
      }

      // Validate if debate is associated with the provided entity
      const isDebateAssociated =
        (entityType === 'club' && debate.club?.toString() === entity) ||
        (entityType === 'node' && debate.node?.toString() === entity);

      if (!isDebateAssociated) {
        return {
          isAllowed: false,
          reason: `Debate is not associated with the provided ${entityType}`,
        };
      }

      // Check membership in the corresponding entity
      let isMember = false;

      if (entityType === 'club') {
        const membership = await this.clubMembersModel.findOne({
          club: new Types.ObjectId(entity),
          user: new Types.ObjectId(userId),
          status: 'MEMBER',
        });
        isMember = !!membership;
      } else if (entityType === 'node') {
        const membership = await this.nodeMembersModel.findOne({
          node: new Types.ObjectId(entity),
          user: new Types.ObjectId(userId),
          status: 'MEMBER',
        });
        isMember = !!membership;
      }

      if (!isMember) {
        return {
          isAllowed: false,
          reason: `User is not a member of the provided ${entityType}`,
        };
      }

      // All checks passed
      return { isAllowed: true };
    } catch (error) {
      console.error('Error in validateParticipation:', error);
      return {
        isAllowed: false,
        reason: 'An error occurred while validating participation',
      };
    }
  }
  async replyToDebateArgument(
    parentId: string,
    content: string,
    userId: string,
  ): Promise<DebateArgument> {
    // Check if the parent debate argument exists
    const parentArgument = await this.debateArgumentModel.findById(parentId);
    if (!parentArgument) {
      throw new NotFoundException(
        `DebateArgument with ID ${parentId} not found`,
      );
    }

    // Create a reply with the author set in the participant
    const reply = new this.debateArgumentModel({
      debate: parentArgument.debate, // Ensure the reply is part of the same debate
      content, // Set the reply content
      participant: {
        user: userId, // Only set the user (author)
      },
      parentId: new Types.ObjectId(parentId), // Associate the reply with its parent
    });

    return (await reply.save()).populate('participant.user');
  }
  async getRepliesForParent(parentId: string): Promise<DebateArgument[]> {
    // Fetch all replies by matching parentId
    return this.debateArgumentModel
      .find({ parentId: new Types.ObjectId(parentId) })
      .populate('participant.user');
  }

  private async uploadFile(
    file: Express.Multer.File,
    section: 'node' | 'club',
  ) {
    try {
      // Uploading file to S3 or other cloud storage service
      const response = await this.s3FileUpload.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        section,
      );
      return response;
    } catch (error) {
      throw new BadRequestException(
        'Failed to upload file. Please try again later.',
      );
    }
  }
  async pin(id: string): Promise<DebateArgument> {
    try {
      // First check if the argument exists
      const argument = await this.debateArgumentModel.findById(id);
      if (!argument) {
        throw new NotFoundException(`Debate argument #${id} not found`);
      }

      // Check if already pinned
      if (argument.isPinned) {
        throw new BadRequestException('Argument is already pinned');
      }

      // Fetch the debate to determine the type of the argument
      const debate = await this.debateModel.findById(argument.debate);
      if (!debate) {
        throw new NotFoundException('Debate not found');
      }

      // Check if the argument matches the type of debate (support or against)
      let type: 'support' | 'against' = argument.participant.side; // Default to 'support' (or based on debate logic)
      // Assuming debate object has a logic to distinguish whether this is for 'support' or 'against'
      if (argument.participant.side !== type) {
        throw new BadRequestException(
          `Argument type mismatch. Expected ${type}`,
        );
      }

      // Check if pinning exceeds the limit (5 for support/against)
      if (type === 'support' && debate.pinnedSupportCount >= 5) {
        throw new BadRequestException('Support arguments pin limit reached');
      }

      if (type === 'against' && debate.pinnedAgainstCount >= 5) {
        throw new BadRequestException('Against arguments pin limit reached');
      }

      // Update the argument by setting it as pinned
      const updatedArgument = await this.debateArgumentModel.findByIdAndUpdate(
        id,
        {
          $set: {
            isPinned: true,
            pinnedAt: new Date(),
          },
        },
        { new: true },
      );

      // If successfully pinned, increment the respective pinned count in the Debate model
      if (updatedArgument.isPinned) {
        if (type === 'support') {
          debate.pinnedSupportCount += 1; // Increment support pinned count
        } else {
          debate.pinnedAgainstCount += 1; // Increment against pinned count
        }
        await debate.save(); // Save the updated debate document
      }

      return updatedArgument;
    } catch (error) {
      // Handle specific known errors
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Log the error for debugging
      console.error('Error while pinning argument:', error);

      // Throw a generic error for unknown issues
      throw new InternalServerErrorException('Failed to pin the argument');
    }
  }

  async unpin(id: string): Promise<DebateArgument> {
    try {
      // First check if the argument exists
      const argument = await this.debateArgumentModel.findById(id);
      if (!argument) {
        throw new NotFoundException(`Debate argument #${id} not found`);
      }

      // Check if the argument is pinned
      if (!argument.isPinned) {
        throw new BadRequestException('Argument is not pinned');
      }

      // Fetch the debate document to update the pinned counts
      const debate = await this.debateModel.findById(argument.debate);
      if (!debate) {
        throw new NotFoundException('Debate not found');
      }

      // Determine the type of the argument (either 'support' or 'against')
      const type: 'support' | 'against' = argument.participant.side;

      // Unpin the argument by updating the 'isPinned' field to false
      const updatedArgument = await this.debateArgumentModel.findByIdAndUpdate(
        id,
        {
          $set: {
            isPinned: false,
            pinnedAt: null,
          },
        },
        { new: true }, // Return the updated document
      );

      // If the argument was successfully unpinned, decrement the respective pinned count in the Debate model
      if (!updatedArgument.isPinned) {
        if (type === 'support') {
          debate.pinnedSupportCount = Math.max(
            debate.pinnedSupportCount - 1,
            0,
          ); // Decrement pinned support count
        } else if (type === 'against') {
          debate.pinnedAgainstCount = Math.max(
            debate.pinnedAgainstCount - 1,
            0,
          ); // Decrement pinned against count
        }
        await debate.save(); // Save the updated debate document
      }

      return updatedArgument;
    } catch (error) {
      // Handle specific known errors
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Log the error for debugging
      console.error('Error while unpinning argument:', error);

      // Throw a generic error for unknown issues
      throw new InternalServerErrorException('Failed to unpin the argument');
    }
  }

  async deleteArgument(id: string) {
    try {
      const argument = await this.debateArgumentModel.findByIdAndDelete(id);
      if (!argument) {
        throw new NotFoundException('Argument not found');
      }
      return { message: 'Argument deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete argument');
    }
  }
}
