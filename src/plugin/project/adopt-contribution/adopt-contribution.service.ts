import {
  BadRequestException,
  Injectable,
  NotAcceptableException,
} from '@nestjs/common';
import { CreateAdoptContributionDto } from './dto/create-adopt-contribution.dto';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Project } from 'src/shared/entities/projects/project.entity';
import { Contribution } from 'src/shared/entities/projects/contribution.entity';
import { of } from 'rxjs';
import { UploadService } from 'src/shared/upload/upload.service';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';
import { ProjectAdoption } from 'src/shared/entities/projects/project-adoption.entity';
import { Club } from 'src/shared/entities/club.entity';
import { Node_ } from 'src/shared/entities/node.entity';
import { ProjectActivities } from 'src/shared/entities/projects/project-activities.entity';

/**
 * Service responsible for handling project contribution adoptions
 * Manages the creation and processing of contributions from users
 */
@Injectable()
export class AdoptContributionService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(Contribution.name)
    private contributionModel: Model<Contribution>,
    @InjectModel(ClubMembers.name)
    private clubMemberModel: Model<ClubMembers>,
    private s3FileUpload: UploadService,
    @InjectModel(ProjectAdoption.name)
    private projectAdoptionModel: Model<ProjectAdoption>,
    @InjectModel(Club.name) private clubModel: Model<Club>,
    @InjectModel(Node_.name) private nodeModel: Model<Node_>,
    @InjectModel(ProjectActivities.name)
    private projectActivities: Model<ProjectActivities>,
  ) {}

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
      const { rootProject, project, parameter, club, node, value, status } =
        createAdoptContributionDto;

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

      // Create the contribution document with processed data
      const newContribution = await this.contributionModel.create({
        rootProject: new Types.ObjectId(rootProject),
        project: new Types.ObjectId(project),
        parameter: new Types.ObjectId(parameter),
        club: club ? new Types.ObjectId(club) : null,
        node: node ? new Types.ObjectId(node) : null,
        user: new Types.ObjectId(userId),
        value,
        status: isCreater ? 'accepted' : 'pending', // Auto-accept if user is project creator
        files: fileObjects?.map((file) => ({
          url: file.url,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        })),
      });
      const newActivity = await this.projectActivities.create({
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
    },
  ) {
    try {
      if (adoptForumDto.club && adoptForumDto.node) {
        throw new BadRequestException('forum be either club or node');
      }
      const userDetails = await this.clubMemberModel.findOne({
        user: new Types.ObjectId(userId),
      });
      const adoptionData = {
        project: new Types.ObjectId(adoptForumDto.project),
        proposedBy: userId,
        ...(userDetails.role !== 'member' && { acceptedBy: userId }),
        node: adoptForumDto?.node || null,
        club: adoptForumDto?.club || null,
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
      throw new NotAcceptableException('Failed to adopt forum');
    }
  }

  /**
   * Get not adopted forum list of a user based on project
   * @param userId
   * @param projectId
   */

  async notAdoptedForum(userId: Types.ObjectId, projectId: Types.ObjectId) {
    try {
      const nonAdoptedClubs = await this.clubModel.aggregate([
        // Stage 1: Find clubs where the user is a member
        {
          $lookup: {
            from: 'clubmembers',
            localField: '_id',
            foreignField: 'club',
            as: 'membership',
          },
        },
        {
          $match: {
            'membership.user': userId,
          },
        },

        // Stage 2: Exclude clubs that have already adopted the project
        {
          $lookup: {
            from: 'projects',
            let: { clubId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$club', '$$clubId'] },
                      { $eq: ['$_id', projectId] },
                    ],
                  },
                },
              },
            ],
            as: 'projectAdoption',
          },
        },
        {
          $match: {
            projectAdoption: { $size: 0 },
          },
        },

        {
          $project: {
            _id: 0,
            clubId: '$_id',
            name: 1,
            image: '$profileImage.url',
          },
        },
      ]);

      const nonAdoptedNodes = await this.nodeModel.aggregate([
        // Stage 1: Find clubs where the user is a member
        {
          $lookup: {
            from: 'nodemembers',
            localField: '_id',
            foreignField: 'club',
            as: 'membership',
          },
        },
        {
          $match: {
            'membership.user': userId,
          },
        },

        // Stage 2: Exclude clubs that have already adopted the project
        {
          $lookup: {
            from: 'projects',
            let: { nodeId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$node', '$$nodeId'] },
                      { $eq: ['$_id', projectId] },
                    ],
                  },
                },
              },
            ],
            as: 'projectAdoption',
          },
        },
        {
          $match: {
            projectAdoption: { $size: 0 },
          },
        },

        {
          $project: {
            _id: 0,
            clubId: '$_id',
            name: 1,
            image: '$profileImage.url',
          },
        },
      ]);

      return {
        data: { nonAdoptedClubs, nonAdoptedNodes },
        message: 'data fetched succesfully',
        success: true,
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch not adopted forum');
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
