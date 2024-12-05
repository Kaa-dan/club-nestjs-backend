import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateAdoptContributionDto } from './dto/create-adopt-contribution.dto';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Project } from 'src/shared/entities/projects/project.entity';
import { Contribution } from 'src/shared/entities/projects/contribution.entity';
import { of } from 'rxjs';
import { UploadService } from 'src/shared/upload/upload.service';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';

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
    files: Express.Multer.File[],
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
        files.map((file) => this.uploadFiles(file)),
      );

      // Create standardized file objects with metadata
      const fileObjects = uploadedFiles.map((file, index) => ({
        url: file.url,
        originalname: files[index].originalname,
        mimetype: files[index].mimetype,
        size: files[index].size,
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

      return newContribution;
    } catch (error) {
      throw new BadRequestException(
        'You are not authorized to create contribution',
      );
    }
  }

  async adoptForum(userId: Types.ObjectId, adoptForumDto) {
    try {
      const clubs = await this.clubMemberModel.find({
        user: new Types.ObjectId(userId),
      });
    } catch (error) {
      throw new BadRequestException('Failed to adopt forum');
    }
  }

  async notAdoptedForum(userId: Types.ObjectId, projectId: Types.ObjectId) {
    try {
      const clubs = await this.clubMemberModel.find({
        user: new Types.ObjectId(userId),
      });
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
