import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RulesRegulations } from 'src/shared/entities/rules-requlations.entity';
import { CreateRulesRegulationsDto } from './dto/rules-regulation.dto';
import { UploadService } from 'src/shared/upload/upload.service';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';
import { NodeMembers } from 'src/shared/entities/node-members.entity';
import { arrayBuffer } from 'stream/consumers';
import { ReportOffence } from 'src/shared/entities/report-offense.entity';
import { Club } from 'src/shared/entities/club.entity';
import { Node_ } from 'src/shared/entities/node.entity';
import { ProposeRulesAndRegulation } from 'src/shared/entities/propose-rulesAndRegulations';
import { type } from 'node:os';
import { async } from 'rxjs';

interface FileObject {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}
// Interface for the file object
export interface IFileObject {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}
@Injectable()
export class RulesRegulationsService {
  constructor(
    @InjectModel(RulesRegulations.name)
    private readonly rulesregulationModel: Model<RulesRegulations>,
    private readonly s3FileUpload: UploadService,
    @InjectModel(ClubMembers.name)
    private readonly clubMembersModel: Model<ClubMembers>,
    @InjectModel(NodeMembers.name)
    private readonly nodeMembersModel: Model<NodeMembers>,
    @InjectModel(ReportOffence.name)
    private readonly reportOffenceModel: Model<ReportOffence>,
    @InjectModel(ProposeRulesAndRegulation.name)
    private readonly ProposeRulesAndRegulationModel: Model<ProposeRulesAndRegulation>,
  ) { }

  /*
  @Param type :strgin  "node"|"club"
  */
  async getAllRulesRegulations() {
    try {
      return await this.rulesregulationModel
        .find({
          isPublic: true,
          isActive: true,
        })
        .populate('createdBy');
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while fetching rules-regulations',
        error,
      );
    }
  }

  /* -----------------CREATE RULES AND REGULATIONS
  @Params :createRulesRegulationsDto
  @return :RulesRegulations */

  async createRulesRegulations(
    createRulesRegulationsDto: CreateRulesRegulationsDto,
  ) {
    ('nithinS');
    const { files: files, node, club, ...restData } = createRulesRegulationsDto;
    let fileObjects = null;
    if (files) {
      //creating promises to upload to S3 bucket
      const uploadPromises = files.map((file: FileObject) =>
        this.uploadFile({
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
        } as Express.Multer.File),
      );
      // calling all promises and storing
      const uploadedFiles = await Promise.all(uploadPromises);

      //creating file object to store it in the db with proper type
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

      const newRulesRegulations = new this.rulesregulationModel(dataToSave);

      return await newRulesRegulations.save();
    } catch (error) {
      ({ error });
      throw new InternalServerErrorException(
        'Error while creating rules-regulations',
        error,
      );
    }
  }

  /*-----------------SAVE TO DRAFT RULES AND RUGULATIONS*/
  async saveToDraft(createRulesRegulationsDto) {
    const { files: files, node, club, ...restData } = createRulesRegulationsDto;

    //creating promises to upload to S3 bucket
    const uploadPromises = files.map((file: FileObject) =>
      this.uploadFile({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
      } as Express.Multer.File),
    );
    // calling all promises and storing
    const uploadedFiles = await Promise.all(uploadPromises);

    //creating file object to store it in the db with proper type
    const fileObjects = uploadedFiles.map((uploadedFile, index) => ({
      url: uploadedFile.url,
      originalname: files[index].originalname,
      mimetype: files[index].mimetype,
      size: files[index].size,
    }));

    try {
      //creating rules and regulations -DB
      const newRulesRegulations = new this.rulesregulationModel({
        ...restData,
        node: node ? new Types.ObjectId(node) : null,
        club: club ? new Types.ObjectId(club) : null,
        files: fileObjects,
      });

      return await newRulesRegulations.save();
    } catch (error) {
      ({ error });
      throw new InternalServerErrorException(
        'Error while creating rules-regulations',
        error,
      );
    }
  }
  /* ---------------------UPDATE RULES AND REGULATIONS
  @Params :updateRulesRegulationDto
  @return :UpdatedRulesRegulations */

  async updateRulesRegulations(
    dataToSave: any,
    userId: Types.ObjectId,
    updateFiles,
  ) {
    try {
      // Find the current version
      const currentVersion = await this.rulesregulationModel.findById(
        dataToSave._id,
      );

      if (!currentVersion) {
        throw new Error('Document not found');
      }

      const { tags, files, ...restData } = dataToSave;

      // Parse and validate `tags`
      let parsedTags = tags;
      if (typeof tags === 'string') {
        try {
          parsedTags = JSON.parse(tags); // Parse if tags is a JSON string
        } catch (error) {
          console.error('Error parsing tags:', error);
          throw new BadRequestException('Invalid format for tags');
        }
      }

      if (!Array.isArray(parsedTags)) {
        throw new BadRequestException('Tags must be an array');
      }

      // Handle file uploads
      const uploadedFiles = await Promise.all(
        updateFiles.map((singlefile) => this.uploadFile(singlefile)),
      );

      // Create file objects
      const fileObjects = uploadedFiles.map((uploadedFile, index) => ({
        url: uploadedFile.url,
        originalname: uploadedFile.originalname,
        mimetype: uploadedFile.mimetype,
        size: uploadedFile.size,
      }));

      // Merging older files with new files
      const mergedFiles = [...(files ?? []), ...fileObjects];

      if (currentVersion.publishedStatus === 'draft') {
        const updateData = await this.rulesregulationModel.findByIdAndUpdate(
          dataToSave._id,
          {
            $set: {
              tags: parsedTags, // Ensure tags is saved as an array
              ...restData, // Spread the rest of the data
              files: mergedFiles,
            },
          },
          { new: true, runValidators: true },
        );
        return updateData;
      } else {
        // Create a version object from the current document
        const versionObject = {
          ...currentVersion.toObject(),
          version: currentVersion.version || 1,
          files: mergedFiles,
        };

        // Update the current document with new data
        const updatedDocument =
          await this.rulesregulationModel.findByIdAndUpdate(
            dataToSave._id,
            {
              $set: {
                ...restData,
                tags: parsedTags, // Ensure tags is saved as an array
                version: (currentVersion.version || 1) + 1,
                publishedBy: userId,
                updatedDate: new Date(),
              },
              $push: {
                olderVersions: versionObject,
              },
            },
            { new: true, runValidators: true },
          );

        return updatedDocument;
      }
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while updating rules-regulations',
        error,
      );
    }
  }

  /*-------------------------GET ALL RULES AND REGULATION OF SINGLE CLUB OR NODE */

  async getAllActiveRulesRegulations(type: string, forId: Types.ObjectId) {
    try {
      ({ hehe: forId, type });
      if (type === 'club') {
        const response = await this.rulesregulationModel
          .find({ isActive: true, club: forId })
          .populate('createdBy')
          .exec();
        ({ response });
        return response;
      } else if (type === 'node') {
        return await this.rulesregulationModel
          .find({ isActive: true, node: forId })
          .exec();
      }
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while getting active rules-regulations',
        error,
      );
    }
  }

  /*-------------------GET MY RULES
   @Req:user_id
   @eturn:RulesRegulations */
  async getMyRules(
    userId: Types.ObjectId,
    type: 'node' | 'club',
    entity: Types.ObjectId,
  ) {
    try {
      ({ userId, type, entity });
      let query = {};

      if (type === 'club') {
        query = {
          createdBy: userId,
          club: new Types.ObjectId(entity),
        };
      } else {
        query = {
          createdBy: userId,
          node: new Types.ObjectId(entity),
        };
      }

      return await this.rulesregulationModel
        .find(query)
        .populate({
          path: 'createdBy',
          select: '-password',
        })
        .exec();
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while getting active rules-regulations',
        error,
      );
    }
  }

  /*--------------------------ADOPT RULES 
  @Body:rulesId,clubId,nodeId,type
  @Req:user_id
  @return:RulesRegulations
   */
  async adoptRules(dataToSave: {
    type: 'club' | 'node';
    rulesId: Types.ObjectId;
    clubId?: Types.ObjectId;
    nodeId?: Types.ObjectId;
    userId: Types.ObjectId;
  }) {
    try {
      // First, find the existing rule document
      const existingRule = await this.rulesregulationModel.findById(
        dataToSave.rulesId,
      );

      if (!existingRule) {
        throw new NotFoundException('Rules regulation not found');
      }

      // Create the new rule document without the _id field
      const {
        title,
        description,
        category,
        significance,
        tags,
        isPublic,
        files,
        publishedStatus,
        publishedBy,
        isActive,
        domain,
      } = existingRule;

      // Prepare base data for the new rule
      const baseRuleData = {
        title,
        description,
        category,
        significance,
        tags,
        isPublic,
        files,
        publishedStatus,
        publishedBy,
        isActive,
        domain,
        adoptedBy: dataToSave.userId,
        adoptedDate: new Date(),
        adoptedParent: dataToSave.rulesId,
        publishedDate: new Date(),
        rootParent: existingRule?.rootParent ?? existingRule?._id,
        version: 1,
      };

      let updateOperation;
      let newRule;

      if (dataToSave.type === 'club') {
        // First check if this club is already in adoptedClubs
        const alreadyAdopted = await this.rulesregulationModel.findOne({
          _id: baseRuleData.rootParent,
          'adoptedClubs.club': new Types.ObjectId(dataToSave.clubId),
        });

        if (!alreadyAdopted) {
          // Only update if not already present
          updateOperation = this.rulesregulationModel.findByIdAndUpdate(
            baseRuleData.rootParent,
            {
              $push: {
                adoptedClubs: {
                  club: new Types.ObjectId(dataToSave.clubId),
                  date: new Date(),
                },
              },
            },
            { new: true },
          );
        } else {
          updateOperation = Promise.resolve(existingRule);
        }

        // Create new rule for the club
        newRule = new this.rulesregulationModel({
          ...baseRuleData,
          club: new Types.ObjectId(dataToSave.clubId),
        });
      } else if (dataToSave.type === 'node') {
        // First check if this node is already in adoptedNodes
        const alreadyAdopted = await this.rulesregulationModel.findOne({
          _id: baseRuleData.rootParent,
          'adoptedNodes.node': new Types.ObjectId(dataToSave.nodeId),
        });

        if (!alreadyAdopted) {
          // Only update if not already present
          updateOperation = this.rulesregulationModel.findByIdAndUpdate(
            baseRuleData.rootParent,
            {
              $push: {
                adoptedNodes: {
                  node: new Types.ObjectId(dataToSave.nodeId),
                  date: new Date(),
                },
              },
            },
            { new: true },
          );
        } else {
          updateOperation = Promise.resolve(existingRule);
        }

        // Create new rule for the node
        newRule = new this.rulesregulationModel({
          ...baseRuleData,
          node: new Types.ObjectId(dataToSave.nodeId),
        });
      } else {
        throw new BadRequestException('Invalid type provided');
      }

      // Execute both operations in parallel
      const [updatedParent, savedRule] = await Promise.all([
        updateOperation,
        newRule.save(),
      ]);

      if (!updatedParent || !savedRule) {
        throw new InternalServerErrorException(
          'Failed to save or update rules',
        );
      }

      return savedRule;
    } catch (error) {
      ({ error });
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error while adopting rules-regulations',
        error.message,
      );
    }
  }
  // get all the nodes and clubs that the user is admin and the rules and regulations are not adopted
  // async getClubsNodesNotAdopted(
  //   userId: Types.ObjectId,
  //   rulesId: Types.ObjectId,
  // ): Promise<Node_[]> {
  //   try {
  //     ('Input Parameters:', { userId, rulesId });

  //     const existingRule = this.rulesregulationModel.findById(
  //       new Types.ObjectId(rulesId),
  //     );
  //     if (!existingRule) {
  //       throw new NotFoundException('Rules regulation not found');
  //     }
  //     const rootParent =
  //       (await existingRule).rootParent ?? new Types.ObjectId(rulesId);
  //     // Stage 1: Match
  //     const nodeAggregation = [
  //       {
  //         $match: {
  //           user: userId,
  //           // Optional: remove this filter if unnecessary
  //         },
  //       },
  //       {
  //         $lookup: {
  //           from: 'node_', // Collection name for nodes
  //           localField: 'node',
  //           foreignField: '_id',
  //           as: 'nodeDetails',
  //         },
  //       },
  //       {
  //         $unwind: '$nodeDetails',
  //       },
  //       {
  //         $lookup: {
  //           from: 'rulesregulations', // Collection name for rules
  //           let: { nodeId: '$node' },
  //           pipeline: [
  //             {
  //               $match: {
  //                 $or: [
  //                   { _id: new Types.ObjectId(rulesId) },
  //                   { rootParent: rootParent },
  //                 ],
  //                 $expr: {
  //                   $not: {
  //                     $in: ['$$nodeId', '$adoptedNodes.node'],
  //                   },
  //                 },
  //               },
  //             },
  //           ],
  //           as: 'unadoptedRules',
  //         },
  //       },
  //       {
  //         $match: {
  //           unadoptedRules: { $ne: [] },
  //         },
  //       },
  //       {
  //         $replaceRoot: {
  //           newRoot: '$nodeDetails',
  //         },
  //       },
  //     ];

  //     const nodes = await this.nodeMembersModel.aggregate(nodeAggregation);

  //     return nodes;
  //   } catch (error) {
  //     console.error('Error while fetching unadopted nodes:', error);
  //     throw new InternalServerErrorException(
  //       'Error while fetching unadopted nodes',
  //       error,
  //     );
  //   }
  // }
  async getClubsNodesNotAdopted(
    userId: Types.ObjectId,
    rulesId: Types.ObjectId,
  ): Promise<{ clubs: Club[]; nodes: Node_[] }> {
    try {

      const existingRule = await this.rulesregulationModel.findById(
        new Types.ObjectId(rulesId),
      );

      if (!existingRule) {
        throw new NotFoundException('Rules regulation not found');
      }

      const rootParent = existingRule.rootParent ?? new Types.ObjectId(rulesId);

      // Nodes Aggregation Pipeline
      const nodeAggregation = [
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
            from: 'rulesregulations',
            let: { nodeId: '$node' },
            pipeline: [
              {
                $match: {
                  $or: [
                    { _id: new Types.ObjectId(rulesId) },
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
            as: 'unadoptedRules',
          },
        },
        {
          $match: {
            unadoptedRules: { $ne: [] },
          },
        },
        {
          $replaceRoot: {
            newRoot: '$nodeDetails',
          },
        },
      ];

      // Clubs Aggregation Pipeline
      const clubAggregation = [
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
            from: 'rulesregulations',
            let: { clubId: '$club' },
            pipeline: [
              {
                $match: {
                  $or: [
                    { _id: new Types.ObjectId(rulesId) },
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
            as: 'unadoptedRules',
          },
        },
        {
          $match: {
            unadoptedRules: { $ne: [] },
          },
        },
        {
          $replaceRoot: {
            newRoot: '$clubDetails',
          },
        },
      ];

      // Run both aggregations concurrently
      const [nodes, clubs] = await Promise.all([
        this.nodeMembersModel.aggregate(nodeAggregation),
        this.clubMembersModel.aggregate(clubAggregation),
      ]);

      return { nodes, clubs };
    } catch (error) {
      console.error('Error while fetching unadopted nodes and clubs:', error);
      throw new InternalServerErrorException(
        'Error while fetching unadopted nodes and clubs',
        error,
      );
    }
  }
  //---------GET SINGLE RULES AND REGULATION

  async getRules(ruleId: Types.ObjectId) {
    try {
      return await (
        await this.rulesregulationModel.findById(ruleId)
      ).populate('createdBy');
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while getting active rules-regulations',
        error,
      );
    }
  }

  /*------------------LIKE RULES AND REGULATIONS
   */
  async likeRulesRegulations(
    userId: Types.ObjectId,
    rulesRegulationId: Types.ObjectId,
  ) {
    try {
      ({ userId, rulesRegulationId });
      // Check if the user has already liked
      const rulesRegulation = await this.rulesregulationModel.findOne({
        _id: rulesRegulationId,
        relevant: userId,
      });

      if (rulesRegulation) {
        throw new BadRequestException(
          'User has already liked this rules regulation',
        );
      }

      // Update the document: Add to relevant array and remove from irrelevant if exists
      const updatedRulesRegulation = await this.rulesregulationModel
        .findByIdAndUpdate(
          rulesRegulationId,
          {
            // Add to relevant array if not exists
            $addToSet: { relevant: new Types.ObjectId(userId) },
            // Remove from irrelevant array if exists
            $pull: { irrelevant: new Types.ObjectId(userId) },
          },
          { new: true, upsert: true },
        )
        .exec();
      ({ updatedRulesRegulation });
      if (!updatedRulesRegulation) {
        throw new NotFoundException('Rules regulation not found');
      }

      return { message: 'Liked successfully' };
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while liking rules-regulations',
        error,
      );
    }
  }

  //--------------UNLIKE RULES AND REGULATIONS
  async unlikeRulesRegulations(
    userId: Types.ObjectId,
    rulesRegulationId: Types.ObjectId,
  ) {
    try {
      // Check if the user has already unliked
      const rulesRegulation = await this.rulesregulationModel.findOne({
        _id: rulesRegulationId,
        irrelevant: userId,
      });
      if (rulesRegulation) {
        throw new BadRequestException(
          'User has not liked this rules regulation',
        );
      }

      // Update the document: Add to irrelevant array and remove from relevant if exists
      const updatedRulesRegulation = await this.rulesregulationModel
        .findByIdAndUpdate(
          rulesRegulationId,
          {
            // Add to  array if not exists
            $addToSet: { irrelevant: userId },
            // Remove from  array if exists
            $pull: { relevant: userId },
          },
          { new: true },
        )
        .exec();

      if (!updatedRulesRegulation) {
        throw new NotFoundException('Rules regulation not found');
      }

      return { message: 'Unliked successfully' };
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while unliking rules-regulations',
        error,
      );
    }
  }

  //-----SOFT DELETE RULES AND REGULATIONS
  async softDeleteRulesRegulations(
    userId: Types.ObjectId,
    rulesRegulationId: Types.ObjectId,
  ) {
    try {
      // Check if the user is the admin
      const isAdmin = await this.rulesregulationModel.findOne({
        _id: rulesRegulationId,
        createdBy: userId,
      });

      if (!isAdmin) {
        throw new BadRequestException(
          'You are not authorized to delete this rule',
        );
      }
      const response = await this.rulesregulationModel.findByIdAndUpdate(
        rulesRegulationId,
        {
          $set: { isDeleted: true },
        },
        { new: true },
      );
      if (!response) {
        throw new NotFoundException('Rules regulation not found');
      }
      return { message: 'rules deleted succesfully', status: true };
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while unliking rules-regulations',
        error,
      );
    }
  }

  //------------------REPORTS OFFENSE
  async reportOffense(
    userId: Types.ObjectId,
    reportData: {
      type: string;
      typeId: Types.ObjectId;
      reason: string;
      rulesID: Types.ObjectId;
      offenderID: Types.ObjectId;
    },
    file: Express.Multer.File,
  ) {
    try {
      const proof = await this.uploadFile(file);

      const newOffense = new this.reportOffenceModel({
        offender: new Types.ObjectId(reportData.offenderID),
        reportedBy: userId,
        reason: reportData.reason,
        rulesId: new Types.ObjectId(reportData.rulesID),
        proof,
        clubOrNode: reportData.type === 'club' ? Club.name : Node_.name,
        clubOrNodeId: new Types.ObjectId(reportData.typeId),
      });
      return await newOffense.save();
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while reporting offense',
        error,
      );
    }
  }

  //---------------GET ALL REPORTS
  async getAllReportOffence(clubId: Types.ObjectId, type: 'node' | 'club') {
    try {
      return await this.reportOffenceModel
        .find({
          clubOrNode: type === 'club' ? Club.name : Node_.name,
          clubOrNodeId: new Types.ObjectId(clubId),
        })
        .populate('offender')
        .populate('reportedBy')
        .populate('rulesId');
    } catch (error) {
      (error);
      throw new InternalServerErrorException(
        'Error while getting all reports',
        error,
      );
    }
  }

  /* -------------CRATE VIEWS FOR THE RULES AND REGULATIONS */
  async createViewsForRulesAndRegulations(
    userId: Types.ObjectId,
    rulesRegulationId: Types.ObjectId,
  ) {
    ({ userId });

    try {
      // Check if the user has already liked
      const rulesRegulation = await this.rulesregulationModel.findOne({
        _id: rulesRegulationId,
        views: userId,
      });

      if (rulesRegulation) {
        throw new BadRequestException(
          'User has already viewed this rules regulation',
        );
      }

      // Update the document: Add to relevant array and remove from irrelevant if exists
      const updatedRulesRegulation = await this.rulesregulationModel
        .findByIdAndUpdate(
          rulesRegulationId,
          {
            // Add to relevant array if not exists
            $addToSet: { views: { user: userId } },
          },
          { new: true },
        )
        .exec();

      if (!updatedRulesRegulation) {
        throw new NotFoundException('Rules regulation not found');
      }

      return { message: 'Viewed successfully' };
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while viewing rules-regulations',
        error,
      );
    }
  }

  /**
   * Propose rules for the club
   * @param req - Express request object
   * @param commentId - ID of the comment to delete
   * @returns Promise containing the result of comment deletion
   */

  async proposeRules(userId: string, data): Promise<ProposeRulesAndRegulation> {
    try {
      // Validate required fields
      if (!userId || !data.club || !data.rulesAndRegulation) {
        throw new BadRequestException('Required fields are missing');
      }

      // Convert string IDs to ObjectId
      const clubId =
        typeof data.club === 'string'
          ? new Types.ObjectId(data.club)
          : data.club;
      const rulesId =
        typeof data.rulesAndRegulation === 'string'
          ? new Types.ObjectId(data.rulesAndRegulation)
          : data.rulesAndRegulation;
      const userObjectId =
        typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

      // Create new proposal
      const newProposal = await this.ProposeRulesAndRegulationModel.create({
        club: clubId,
        proposedBy: userObjectId,
        rulesAndRegulation: rulesId,
        status: 'pending',
      });

      // returning newly created proposal
      const populatedProposal = await newProposal.populate([
        { path: 'club' },
        { path: 'proposedBy' },
        { path: 'rulesAndRegulation' },
      ]);

      return populatedProposal;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      }
      if (error.name === 'CastError') {
        throw new BadRequestException('Invalid ID format');
      }
      throw new Error(`Failed to propose rules: ${error.message}`);
    }
  }

  /**
   * Get all the clubs and node of the user with role of the user
   * @returns Promise containing the result of the data
   */
  async getAllClubsAndNodesWithRole(userId: Types.ObjectId) {
    try {
      const clubResponse = await this.clubMembersModel
        .find({ user: userId, status: 'MEMBER' })
        .populate(Club.name);

      const nodeResponse = await this.nodeMembersModel
        .find({ user: userId })
        .populate(Node.name);

      return {
        data: { clubResponse, nodeResponse },
        status: true,
        message: 'club fetched sucessfully',
      };
    } catch (error) {
      throw new BadRequestException('something went wrong');
    }
  }

  //------------------------
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
