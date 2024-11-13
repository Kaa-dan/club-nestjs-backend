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

interface FileObject {
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
  ) {}

  /*
  @Param type :strgin  "node"|"club"
  */
  async getAllRulesRegulations(type?: string) {
    try {
      //according to the types returning the rules and regulations
      switch (type) {
        case 'node':
          return await this.rulesregulationModel
            .find({ status: 'published', isPublic: true, isActive: true })
            .exec();
        case 'club':
          return await this.rulesregulationModel
            .find({ status: 'published', isPublic: true, isActive: true })
            .exec();

        default:
          return await this.rulesregulationModel
            .find({ status: 'published', isPublic: true, isActive: true })
            .exec();
      }
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
      console.log({ error });
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

      const { files, ...restData } = dataToSave;
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
      //merging older files with new files
      const mergedFiles = [...files, ...fileObjects];

      if (currentVersion.publishedStatus === 'draft') {
        const updateData = await this.rulesregulationModel.findByIdAndUpdate(
          dataToSave._id,
          {
            $set: {
              restData,
              files: mergedFiles,
            },
          },
        );
        return updateData;
      } else {
        // Create a version object from the current document
        const versionObject = {
          ...currentVersion.toObject(),
          version: currentVersion.version || 1,
          files: mergedFiles,
        };

        //Update the current document with new data
        const updatedDocument =
          await this.rulesregulationModel.findByIdAndUpdate(
            dataToSave._id,
            {
              $set: {
                ...restData,
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
      console.log({ forId, type });
      if (type === 'club') {
        const response = await this.rulesregulationModel
          .find({ isActive: true, club: forId })
          .populate('createdBy')
          .exec();
        console.log({ response });
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
  async getMyRules(userId: Types.ObjectId) {
    try {
      //fetching from DB
      return await this.rulesregulationModel.find({ createdBy: userId }).exec();
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
      const ruleData = existingRule.toObject();
      delete ruleData._id;

      // Prepare base data for the new rule
      const baseRuleData = {
        ...ruleData,
        adoptedBy: dataToSave.userId,
        adoptedDate: new Date(),
        adoptedParent: dataToSave.rulesId,
        publishedDate: new Date(),
        version: 1,
      };

      let updateOperation;
      let newRule;

      if (dataToSave.type === 'club') {
        // Update the parent rule to add this club to adoptedClubs
        updateOperation = this.rulesregulationModel.findByIdAndUpdate(
          dataToSave.rulesId,
          {
            $addToSet: { adoptedClubs: dataToSave.clubId },
          },
          { new: true },
        );

        // Create new rule for the club
        newRule = new this.rulesregulationModel({
          ...baseRuleData,
          club: dataToSave.clubId,
        });
      } else if (dataToSave.type === 'node') {
        // Update the parent rule to add this node to adoptedNodes
        updateOperation = this.rulesregulationModel.findByIdAndUpdate(
          dataToSave.rulesId,
          {
            $addToSet: { adoptedNodes: dataToSave.nodeId },
          },
          { new: true },
        );

        // Create new rule for the node
        newRule = new this.rulesregulationModel({
          ...baseRuleData,
          node: dataToSave.nodeId,
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
  //get all the nodes and clubs that the user is admin and the rules and regulations are not adopted
  async getClubsNodesNotAdopted(
    userId: Types.ObjectId,
    rulesId: Types.ObjectId,
  ): Promise<{ clubs: any[]; nodes: any[] }> {
    try {
      // Get all clubs where user is admin
      const clubsQuery = await this.clubMembersModel.aggregate([
        {
          $match: {
            user: userId,
            role: 'admin',
            status: 'MEMBER',
          },
        },
        {
          $lookup: {
            from: 'rulesandregulations',
            let: { clubId: '$club' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$_id', rulesId] },
                      {
                        $not: [
                          {
                            $in: ['$$clubId', '$adoptedClubs'],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            ],
            as: 'notAdoptedRules',
          },
        },
        {
          $match: {
            'notAdoptedRules.0': { $exists: true },
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
          $project: {
            _id: '$clubDetails._id',
            name: '$clubDetails.name',
            description: '$clubDetails.description',
            // add other fields according to the requirements
          },
        },
      ]);

      // Get all nodes where user is admin
      const nodesQuery = await this.nodeMembersModel.aggregate([
        {
          $match: {
            user: userId,
            role: 'admin',
            status: 'MEMBER',
          },
        },
        {
          $lookup: {
            from: 'rulesandregulations',
            let: { nodeId: '$node' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$_id', rulesId] },
                      {
                        $not: [
                          {
                            $in: ['$$nodeId', '$adoptedNodes'],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            ],
            as: 'notAdoptedRules',
          },
        },
        {
          $match: {
            'notAdoptedRules.0': { $exists: true },
          },
        },
        {
          $lookup: {
            from: 'nodes',
            localField: 'node',
            foreignField: '_id',
            as: 'nodeDetails',
          },
        },
        {
          $unwind: '$nodeDetails',
        },
        {
          $project: {
            _id: '$nodeDetails._id',
            name: '$nodeDetails.name',
            description: '$nodeDetails.description',
            // add other node fields which are required
          },
        },
      ]);

      // Execute both queries in parallel
      const [clubs, nodes] = await Promise.all([clubsQuery, nodesQuery]);

      return { clubs, nodes };
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while fetching clubs and nodes',
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
