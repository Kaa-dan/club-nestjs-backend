import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Issues } from 'src/shared/entities/issues.entity';
import { UploadService } from 'src/shared/upload/upload.service';
import { CreateIssuesDto } from './dto/create-issue.dto';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';
import { NodeMembers } from 'src/shared/entities/node-members.entity';
import { async, publish } from 'rxjs';
import { Node_ } from 'src/shared/entities/node.entity';
import { Club } from 'src/shared/entities/club.entity';
import { title } from 'process';

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
  ) {}

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
      console.log({ error });
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
      console.log({ error });
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
  async getAllActiveIssues(entity: 'node' | 'club', entityId: Types.ObjectId) {
    try {
      let query = {};
      if (entity === 'node') {
        query = {
          node: entityId,
          isActive: true,
          publishedStatus: 'published',
        };
      } else {
        query = {
          club: entityId,
          isActive: true,
          publishedStatus: 'published',
        };
      }
      return await this.issuesModel
        .find(query)
        .populate('createdBy', '-password')
        .exec();
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Error while getting active rules-regulations',
        error,
      );
    }
  }

  async getAllIssues(entity: 'node' | 'club', entityId: Types.ObjectId) {
    try {
      let query = {};
      if (entity === 'node') {
        query = {
          node: entityId,
        };
      } else {
        query = {
          club: entityId,
        };
      }
      return await this.issuesModel
        .find(query)
        .populate('createdBy', '-password')
        .exec();
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Error while getting active rules-regulations',
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
  ) {
    try {
      let query = {};

      if (entity === 'node') {
        query = {
          createdBy: userId,
          node: entityId,
        };
      } else {
        query = {
          createdBy: userId,
          club: entityId,
        };
      }
      return await this.issuesModel.find(query).exec();
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Error while getting active rules-regulations',
        error,
      );
    }
  }

  async getGlobalActiveIssues() {
    try {
      return await this.issuesModel
        .find({
          isActive: true,

          publishedStatus: 'published',
        })
        .populate('createdBy', '-password')
        .populate('node')
        .populate('club')
        .exec();
    } catch (error) {
      console.log(error);
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
        .exec();

      console.log(response, 'ice');
      return response;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Error while getting specific issue',
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
      console.log(error);
      throw new BadRequestException(
        'Failed to upload file. Please try again later.',
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
        console.log(memberInfo);
        return memberInfo.role;
      }

      const memberInfo = await this.clubMembersModel.findOne({
        club: new Types.ObjectId(createIssuesData.club),
        user: new Types.ObjectId(userId),
      });
      console.log(memberInfo);
      return memberInfo.role;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Error while getting user roles',
        error,
      );
    }
  }

  async adoptIssueAndPropose(userId: Types.ObjectId, data) {
    try {
      let clubOrNode: null | string = data?.club ? 'club' : 'node';

      console.log(data, 'data');

      if (!clubOrNode) throw new BadRequestException('Invalid club or node');
      const role = await this.getMemberRoles(userId, data);
      if (role === 'admin') {
        if (data.club) {
          await this.issuesModel.findByIdAndUpdate(
            data.issueId,
            {
              $addToSet: {
                adoptedClubs: {
                  club: new Types.ObjectId(data.club),
                  date: new Date(),
                },
              },
            },
            { new: true }, // Returns the updated document
          );
        } else if (data.node) {
          await this.issuesModel.findByIdAndUpdate(
            data.issueId,
            {
              $addToSet: {
                adoptedNodes: {
                  node: new Types.ObjectId(data.node),
                  date: new Date(),
                },
              },
            },
            { new: true }, // Returns the updated document
          );
        }
        const existingIssue = await this.issuesModel.findById(data.issueId);
        // Creating a new object
        // const newIssueData = {
        //   ...existingIssue.toObject(), // Converting to plain object
        //   publishedBy: userId,
        //   publishedDate: new Date(),
        //   version: 1,
        //   isActive: true,
        //   publishedStatus: 'published',
        //   ...(clubOrNode === 'club'
        //     ? { club: new Types.ObjectId(data.club) }
        //     : { node: new Types.ObjectId(data.node) }),
        //   adoptedDate: new Date(),
        //   adoptedFrom: existingIssue._id,
        // };

        const newIssueData = {
          title: existingIssue.title,
          issueType: existingIssue.issueType,
          whereOrWho: existingIssue.whereOrWho,
          deadline: existingIssue.deadline,
          reasonOfDeadline: existingIssue.reasonOfDeadline,
          significance: existingIssue.significance,
          description: existingIssue.description,
          files: existingIssue.files,
          isPublic: existingIssue.isPublic,
          isAnonymous: existingIssue.isAnonymous,
          ...(clubOrNode === 'club'
            ? { club: new Types.ObjectId(data.club) }
            : { node: new Types.ObjectId(data.node) }),
          createdBy: userId,
          isActive: true,
          publishedStatus: 'published',
          publishedBy: userId,
          publishedDate: new Date(),
          version: 1,
          adoptedDate: new Date(),
          adoptedFrom: existingIssue._id,
        };

        // Removing fields
        // delete newIssueData._id;
        // delete newIssueData.__v;

        // creating new fields with modified data
        const newIssue = await this.issuesModel.create(newIssueData);

        return newIssue;
      } else if (role === 'member') {
        const existingIssue = await this.issuesModel.findById(data.issueId);
        // Creating a new object
        // const newIssueData = {
        //   ...existingIssue.toObject(), // Converting to plain object
        //   publishedBy: userId,
        //   version: 1,
        //   isActive: false,
        //   publishedStatus: 'proposed',
        //   ...(clubOrNode === 'club'
        //     ? { club: new Types.ObjectId(data.club) }
        //     : { node: new Types.ObjectId(data.node) }),
        //   adoptedDate: new Date(),
        //   adoptedFrom: existingIssue._id,
        // };

        const newIssueData = {
          title: existingIssue.title,
          issueType: existingIssue.issueType,
          whereOrWho: existingIssue.whereOrWho,
          deadline: existingIssue.deadline,
          reasonOfDeadline: existingIssue.reasonOfDeadline,
          significance: existingIssue.significance,
          description: existingIssue.description,
          files: existingIssue.files,
          isPublic: existingIssue.isPublic,
          isAnonymous: existingIssue.isAnonymous,
          ...(clubOrNode === 'club'
            ? { club: new Types.ObjectId(data.club) }
            : { node: new Types.ObjectId(data.node) }),
          createdBy: userId,
          publishedStatus: 'proposed',
          isActive: false,
          version: 1,
          adoptedDate: new Date(),
          adoptedFrom: existingIssue._id,
        };

        // Removing fields
        // delete newIssueData._id;
        // delete newIssueData.views;
        // delete newIssueData.relevant;
        // delete newIssueData.irrelevant;
        // delete newIssueData.adoptedClubs;
        // delete newIssueData.adoptedNodes;
        // delete newIssueData.createdBy;
        // delete newIssueData.updatedDate;
        // delete newIssueData.olderVersions;
        // delete newIssueData.__v;

        // creating new fields with modified data
        const newIssue = await this.issuesModel.create(newIssueData);

        return newIssue;
      }

      // return adoptedIssue;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'Error while adopting issue',
        error,
      );
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
          .populate('createdBy', '-password')
          .exec();
      } else {
        return await this.issuesModel
          .find({ club: entityId, publishedStatus: 'proposed' })
          .populate('createdBy', '-password')
          .exec();
      }
    } catch (error) {
      console.log(error);
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
      console.log(error);

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
      console.log(error);

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

      const issue = await this.issuesModel.findById(issueId);

      if (!issue) {
        throw new NotFoundException('Issue not found');
      }

      let adoptedClubs: Types.ObjectId[] = [];
      let adoptedNodes: Types.ObjectId[] = [];

      adoptedClubs = issue.adoptedClubs.map((club) => club.club);
      adoptedNodes = issue.adoptedNodes.map((node) => node.node);

      // Find clubs where user is a member but hasn't adopted the issue
      const memberClubs = await this.clubModel.aggregate([
        {
          $match: {
            _id: {
              $nin: [...adoptedClubs, issue.club].filter(Boolean),
            },
          },
        },
        {
          // First lookup to check adoptedFrom in issues
          $lookup: {
            from: 'issues',
            let: { clubId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$club', '$$clubId'] },
                      { $eq: ['$adoptedFrom', new Types.ObjectId(issueId)] },
                    ],
                  },
                },
              },
            ],
            as: 'adoptedFromIssues',
          },
        },
        {
          $match: {
            adoptedFromIssues: { $size: 0 }, // Exclude clubs that have adopted from this issue
          },
        },
        // {
        //   $lookup: {
        //     from: 'issues',
        //     let: { clubId: '$_id' },
        //     pipeline: [
        //       {
        //         $match: {
        //           $expr: {
        //             $and: [
        //               { $eq: ['$club', '$$clubId'] },
        //               { $eq: ['$createdBy', new Types.ObjectId(userId)] }
        //             ]
        //           }
        //         }
        //       }
        //     ],
        //     as: 'createdByIssues'
        //   }
        // },
        // {
        //   $match: {
        //     createdByIssues: { $size: 0 } // Exclude nodes that have adopted from this issue
        //   }
        // },
        {
          $lookup: {
            from: 'clubmembers',
            let: { clubId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$club', '$$clubId'] },
                      { $eq: ['$user', new Types.ObjectId(userId)] },
                    ],
                  },
                },
              },
            ],
            as: 'userMembership',
          },
        },
        {
          $match: {
            userMembership: { $not: { $size: 0 } }, // Clubs where user is a member
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            description: 1,
            userRole: { $arrayElemAt: ['$userMembership.role', 0] }, // Include user's role
          },
        },
      ]);

      // Find nodes where user is a member but hasn't adopted the issue
      const memberNodes = await this.nodeModel.aggregate([
        {
          $match: {
            _id: {
              $nin: [...adoptedNodes, issue.node].filter(Boolean),
            },
          },
        },
        {
          // Add lookup to check adoptedFrom in issues
          $lookup: {
            from: 'issues',
            let: { nodeId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$node', '$$nodeId'] },
                      { $eq: ['$adoptedFrom', new Types.ObjectId(issueId)] },
                    ],
                  },
                },
              },
            ],
            as: 'adoptedFromIssues',
          },
        },
        // {
        //   $lookup: {
        //     from: 'issues',
        //     let: { nodeId: '$_id' },
        //     pipeline: [
        //       {
        //         $match: {
        //           $expr: {
        //             $and: [
        //               { $eq: ['$node', '$$nodeId'] },
        //               { $eq: ['$createdBy', new Types.ObjectId(userId)] }
        //             ]
        //           }
        //         }
        //       }
        //     ],
        //     as: 'createdByIssues'
        //   }
        // },
        // {
        //   $match: {
        //     createdByIssues: { $size: 0 } // Exclude nodes that have adopted from this issue
        //   }
        // },
        {
          $lookup: {
            from: 'nodemembers',
            let: { nodeId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$node', '$$nodeId'] },
                      { $eq: ['$user', new Types.ObjectId(userId)] },
                    ],
                  },
                },
              },
            ],
            as: 'userMembership',
          },
        },
        {
          $match: {
            userMembership: { $not: { $size: 0 } }, // Nodes where user is a member
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            description: 1,
            userRole: { $arrayElemAt: ['$userMembership.role', 0] }, // Include user's role
          },
        },
      ]);

      return {
        clubs: memberClubs,
        nodes: memberNodes,
      };
    } catch (error) {
      console.log(error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error while getting clubs and nodes not adopted',
        error,
      );
    }
  }
}
