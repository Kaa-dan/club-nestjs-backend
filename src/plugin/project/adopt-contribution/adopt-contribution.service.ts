import {
  BadRequestException,
  Injectable,
  NotAcceptableException,
} from '@nestjs/common';
import { CreateAdoptContributionDto } from './dto/create-adopt-contribution.dto';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Project } from 'src/shared/entities/projects/project.entity';
import { ProjectContribution } from 'src/shared/entities/projects/contribution.entity';
import { async, of } from 'rxjs';
import { UploadService } from 'src/shared/upload/upload.service';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';
import { ProjectAdoption } from 'src/shared/entities/projects/project-adoption.entity';
import { Club } from 'src/shared/entities/club.entity';
import { Node_ } from 'src/shared/entities/node.entity';
import { ProjectActivities } from 'src/shared/entities/projects/project-activities.entity';
import { ServiceResponse } from 'src/shared/types/service.response.type';
import { NodeMembers } from 'src/shared/entities/node-members.entity';

/**
 * Service responsible for handling project contribution adoptions
 * Manages the creation and processing of contributions from users
 */
@Injectable()
export class AdoptContributionService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(ProjectContribution.name)
    private contributionModel: Model<ProjectContribution>,
    @InjectModel(ClubMembers.name)
    private clubMemberModel: Model<ClubMembers>,
    @InjectModel(NodeMembers.name)
    private nodeMemberModel: Model<NodeMembers>,
    private s3FileUpload: UploadService,
    @InjectModel(ProjectAdoption.name)
    private projectAdoptionModel: Model<ProjectAdoption>,
    @InjectModel(Club.name) private clubModel: Model<Club>,
    @InjectModel(Node_.name) private nodeModel: Model<Node_>,
    @InjectModel(ProjectActivities.name)
    private projectActivitiesModel: Model<ProjectActivities>,
  ) { }

  /**
   * Creates a new contribution for a project
   * @param createAdoptContributionDto - Contains contribution details like project, parameter, value etc
   * @param userId - ID of the user creating the contribution
   * @param files - Array of files to be uploaded with the contribution
   * @returns Newly created contribution document
   * @throws BadRequestException if validation fails or user lacks permissions
   */
  async create(
    createAdoptContributionDto: CreateAdoptContributionDto,
    userId: Types.ObjectId,
    files: { file: Express.Multer.File[] },
  ) {
    try {
      let { rootProject, project, parameter, club, node, value, status } =
        createAdoptContributionDto;

      console.log({ createAdoptContributionDto });
      console.log({ project });
      if (!project) project = rootProject;

      // Validate that either club or node is provided
      if (!club && !node) {
        throw new BadRequestException('Club or node is required');
      }

      // Upload all files concurrently for better performance
      const uploadedFiles = await Promise.all(
        files.file.map((file) => this.uploadFiles(file)),
      );
      // Create standardized file objects with metadata
      const fileObjects = uploadedFiles.map((file, index) => ({
        url: file.url,
        originalname: files.file[index].originalname,
        mimetype: files.file[index].mimetype,
        size: files.file[index].size,
      }));

      // Check if user is the original project creator
      // This determines if contribution is auto-accepted
      const isCreater = await this.projectModel.findOne({
        _id: new Types.ObjectId(rootProject),
        createdBy: new Types.ObjectId(userId),
      });
      console.log({ isCreater });

      // Create the contribution document with processed data
      const newContribution = await this.contributionModel.create({
        rootProject: new Types.ObjectId(rootProject),
        project: new Types.ObjectId(project),
        parameter: new Types.ObjectId(parameter),
        club: club ? new Types.ObjectId(club) : null,
        node: node ? new Types.ObjectId(node) : null,
        user: new Types.ObjectId(userId),
        value,
        // reamarks,
        status: isCreater ? 'accepted' : 'pending', // Auto-accept if user is project creator
        files: fileObjects?.map((file) => ({
          url: file.url,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        })),
      });
      const newActivity = await this.projectActivitiesModel.create({
        author: new Types.ObjectId(userId),
        contribution: newContribution._id,
      });

      return {
        succes: true,
        data: { newContribution, newActivity },
        message: 'contributed succesfully',
      };
    } catch (error) {
      throw new BadRequestException(
        'You are not authorized to create contribution',
      );
    }
  }
  /**
   * Adopt or propose project in a forum based on user role
   * @param userId
   * @param adoptForumDto
   * @returns proposed project with message
   */

  async adoptForum(
    userId: Types.ObjectId,
    adoptForumDto: {
      project: Types.ObjectId;
      node?: Types.ObjectId;
      club?: Types.ObjectId;
      proposalMessage: string
    },
  ) {
    console.log({ adoptForumDto });

    try {
      if (adoptForumDto.club && adoptForumDto.node) {
        throw new BadRequestException(
          'Forum must be either club or node, not both',
        );
      }
      console.log({ userId });

      let userDetails;
      if (adoptForumDto.club) {
        // Check role for club
        userDetails = await this.clubMemberModel.findOne({
          user: new Types.ObjectId(userId),
          club: new Types.ObjectId(adoptForumDto.club),
        });
      } else if (adoptForumDto.node) {
        // Check role for node
        userDetails = await this.nodeMemberModel.findOne({
          user: new Types.ObjectId(userId),
          node: new Types.ObjectId(adoptForumDto.node),
        });
      }

      if (!userDetails) {
        throw new NotAcceptableException(
          'User not found in the specified forum',
        );
      }

      console.log({ userDetails });

      const adoptionData = {
        project: new Types.ObjectId(adoptForumDto.project),
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
      const adoptedProject =
        await this.projectAdoptionModel.create(adoptionData);

      return {
        success: true,
        data: adoptedProject,
        message: 'Project adopted successfully',
      };
    } catch (error) {
      console.log({ error });

      throw new NotAcceptableException('Failed to adopt forum');
    }
  }

  /**
   * Get not adopted forum list of a user based on project
   * @param userId
   * @param projectId
   */



  async notAdoptedForum(userId: Types.ObjectId, projectId: Types.ObjectId) {
    // First get the project details to know which forum it belongs to
    const project = await this.projectModel.findById(projectId);
    if (!project) {
      throw new BadRequestException('Project not found');
    }

    // Get already adopted forums for this project
    const adoptedProjects = await this.projectAdoptionModel.find({
      project: new Types.ObjectId(projectId),
    });

    console.log({ adoptedProjects });

    // Extract adopted club and node IDs
    const adoptedClubIds = adoptedProjects
      .filter((ap) => ap.club)
      .map((ap) => ap.club.toString());
    const adoptedNodeIds = adoptedProjects
      .filter((ap) => ap.node)
      .map((ap) => ap.node.toString());

    console.log({ adoptedClubIds, adoptedNodeIds });

    // Find all clubs where user is a member and exclude:
    // 1. The club that owns the project
    // 2. Clubs that have already adopted the project
    const eligibleClubs = await this.clubMemberModel
      .find({
        user: userId,
        status: 'MEMBER',
      })
      .populate('club', 'name profileImage isPublic createdBy')
      .then((members) =>
        members
          .filter((member) => {
            const clubId = member.club._id.toString();
            const isProjectOwner = project.club?.toString() === clubId;
            const hasAdopted = adoptedClubIds.includes(clubId);
            // return !isProjectOwner && !hasAdopted;
            return !hasAdopted;
          })
          .map((member: any) => ({
            _id: member.club._id,
            name: member.club['name'],
            type: 'club',
            role: member.role,
            image: member?.club?.profileImage?.url,
          })),
      );

    // Find all nodes where user is a member and exclude:
    // 1. The node that owns the project
    // 2. Nodes that have already adopted the project
    const eligibleNodes = await this.nodeMemberModel
      .find({
        user: userId,
        status: 'MEMBER',
      })
      .populate('node', 'name profileImage isPublic createdBy')
      .then((members: any) =>
        members
          .filter((member) => {
            const nodeId = member.node._id.toString();
            // const isProjectOwner = project.node?.toString() === nodeId;
            const hasAdopted = adoptedNodeIds.includes(nodeId);
            // return !isProjectOwner && !hasAdopted;
            return !hasAdopted;
          })
          .map((member) => ({
            _id: member?.node._id,
            name: member?.node['name'],
            type: 'node',
            role: member?.role,
            image: member?.node?.profileImage?.url,
          })),
      );

    // Combine and return results
    return {
      forums: [...eligibleClubs, ...eligibleNodes],
    };
  }

  /**
   *
   */

  /**
   *
   */
  async getActivitiesOfProject(projectID: Types.ObjectId) {
    try {
      console.log({ projectID });
      if (!projectID) {
        throw new BadRequestException('project id not found');
      }
      const activities = await this.projectActivitiesModel.aggregate([
        // Match activities related to contributions of the specific project
        {
          $lookup: {
            from: 'contributions',
            localField: 'contribution',
            foreignField: '_id',
            as: 'contributionDetails',
          },
        },
        {
          $unwind: '$contributionDetails',
        },
        // Filter for contributions related to the project
        {
          $match: {
            $or: [
              { 'contributionDetails.project': new Types.ObjectId(projectID) },
              {
                'contributionDetails.rootProject': new Types.ObjectId(
                  projectID,
                ),
              },
            ],
          },
        },
        // Lookup parameters collection
        {
          $lookup: {
            from: 'parameters',
            localField: 'contributionDetails.parameter',
            foreignField: '_id',
            as: 'parameterDetails',
          },
        },
        {
          $unwind: '$parameterDetails',
        },
        // Lookup users collection for author details
        {
          $lookup: {
            from: 'users',
            localField: 'author',
            foreignField: '_id',
            as: 'authorDetails',
          },
        },
        {
          $unwind: '$authorDetails',
        },
        // Project and shape the output
        {
          $project: {
            _id: 1,
            date: 1,
            activityType: 1,
            contribution: {
              _id: '$contributionDetails._id',
              rootProject: '$contributionDetails.rootProject',
              project: '$contributionDetails.project',
              parameter: {
                _id: '$parameterDetails._id',
                project: '$parameterDetails.project',
                title: '$parameterDetails.title',
                value: '$parameterDetails.value',
                unit: '$parameterDetails.unit',
                createdAt: '$parameterDetails.createdAt',
                updatedAt: '$parameterDetails.updatedAt',
              },
              user: '$contributionDetails.user',
              club: '$contributionDetails.club',
              node: '$contributionDetails.node',
              value: '$contributionDetails.value',
              files: '$contributionDetails.files',
              status: '$contributionDetails.status',
              createdAt: '$contributionDetails.createdAt',
              updatedAt: '$contributionDetails.updatedAt',
            },
            author: {
              _id: '$authorDetails._id',
              userName: '$authorDetails.userName',
              firstName: '$authorDetails.firstName',
              lastName: '$authorDetails.lastName',
              image: '$authorDetails.profileImage',
            },
          },
        },
        // Sort by most recent first
        {
          $sort: { date: -1 },
        },
      ]);

      return activities;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getLeaderBoard(
    userId: Types.ObjectId,
    projectId: Types.ObjectId,
    forumId: Types.ObjectId,
    forumType: 'club' | 'node',
  ) {
    try {

      const memberWize = await this.contributionModel.aggregate([
        // Match contributions for the specific root project
        {
          $match: {
            rootProject: new Types.ObjectId(projectId),
          },
        },

        // Lookup to get parameter details
        {
          $lookup: {
            from: 'parameters',
            localField: 'parameter',
            foreignField: '_id',
            as: 'parameterDetails',
          },
        },

        // Unwind the parameter details
        {
          $unwind: '$parameterDetails',
        },

        // Lookup to get user details
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userDetails',
          },
        },

        // Unwind the user details
        {
          $unwind: '$userDetails',
        },

        // Group by user and parameter
        {
          $group: {
            _id: {
              userId: '$user',
              parameterId: '$parameter',
            },
            user: { $first: '$userDetails' },
            parameter: { $first: '$parameterDetails' },
            totalValue: { $sum: '$value' },
            contributions: {
              $push: {
                _id: '$_id',
                value: '$value',
                files: '$files',
                status: '$status',
                createdAt: '$createdAt',
              },
            },
          },
        },

        // Group by user to get all parameters for each user
        {
          $group: {
            _id: '$_id.userId',
            userData: { $first: '$user' },
            totalContributions: {
              $push: {
                parameter: '$parameter',
                totalValue: '$totalValue',
                contributions: '$contributions',
              },
            },
            overallTotal: { $sum: '$totalValue' },
          },
        },

        // Project the final shape of the document
        {
          $project: {
            _id: 1,
            user: {
              _id: '$userData._id',
              userName: '$userData.userName',
              firstName: '$userData.firstName',
              lastName: '$userData.lastName',
              profileImage: '$userData.profileImage',
            },
            totalContributions: 1,
            overallTotal: 1,
          },
        },

        // Sort by overall total in descending order
        {
          $sort: {
            overallTotal: -1,
          },
        },
      ]);

      const forumWise = await this.contributionModel.aggregate([
        // Match contributions for the specific root project
        {
          $match: {
            rootProject: new Types.ObjectId(projectId),
          },
        },

        // Add lookups for club and node details
        {
          $lookup: {
            from: 'clubs',
            localField: 'club',
            foreignField: '_id',
            as: 'clubDetails',
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

        // Add lookup for parameter details
        {
          $lookup: {
            from: 'parameters',
            localField: 'parameter',
            foreignField: '_id',
            as: 'parameterDetails',
          },
        },

        // Unwind the parameter details
        {
          $unwind: '$parameterDetails',
        },

        // Determine forum type and details
        {
          $addFields: {
            forumType: {
              $cond: {
                if: { $gt: [{ $size: '$clubDetails' }, 0] },
                then: 'club',
                else: 'node',
              },
            },
            forumDetails: {
              $cond: {
                if: { $gt: [{ $size: '$clubDetails' }, 0] },
                then: { $arrayElemAt: ['$clubDetails', 0] },
                else: { $arrayElemAt: ['$nodeDetails', 0] },
              },
            },
          },
        },

        // Group by forum and parameter
        {
          $group: {
            _id: {
              forumId: {
                $cond: {
                  if: { $eq: ['$forumType', 'club'] },
                  then: '$club',
                  else: '$node',
                },
              },
              parameterId: '$parameter',
            },
            forumType: { $first: '$forumType' },
            forumDetails: { $first: '$forumDetails' },
            parameter: { $first: '$parameterDetails' },
            totalValue: { $sum: '$value' },
            contributions: {
              $push: {
                _id: '$_id',
                value: '$value',
                files: '$files',
                status: '$status',
                createdAt: '$createdAt',
              },
            },
          },
        },

        // Group by forum to get all parameters
        {
          $group: {
            _id: '$_id.forumId',
            forumType: { $first: '$forumType' },
            forumDetails: { $first: '$forumDetails' },
            totalContributions: {
              $push: {
                parameter: '$parameter',
                totalValue: '$totalValue',
                contributions: '$contributions',
              },
            },
            overallTotal: { $sum: '$totalValue' },
          },
        },

        // Final project stage
        {
          $project: {
            _id: 1,
            forumType: 1,
            forum: {
              _id: '$_id',
              name: '$forumDetails.name',
              profileImage: '$forumDetails.profileImage',
            },
            totalContributions: 1,
            overallTotal: 1,
          },
        },

        // Sort by overall total
        {
          $sort: {
            overallTotal: -1,
          },
        },
      ]);

      return {
        totalContributors: memberWize.length,
        memberWize,
        forumWise,
      };
    } catch (error) {
      // Handle any errors
      console.error('Error fetching leaderboard:', error);
      throw new Error('Failed to retrieve leaderboard');
    }
  }

  /**
   * Helper method to upload files to S3 storage
   * @param file - File to be uploaded
   * @returns Upload response containing the file URL
   * @throws BadRequestException if upload fails
   */

  private async uploadFiles(file: Express.Multer.File) {
    try {
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
