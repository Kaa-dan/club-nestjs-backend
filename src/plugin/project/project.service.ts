import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CreateProjectDto,
  UpdateProjectDto,
} from './dto/create-update-project.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project } from 'src/shared/entities/projects/project.entity';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';
import { NodeMembers } from 'src/shared/entities/node-members.entity';
import { UploadService } from 'src/shared/upload/upload.service';

/**
 * Service handling all project-related business logic
 * Manages project creation, updates, and file uploads
 */
@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(ClubMembers.name)
    private readonly clubMembersModel: Model<ClubMembers>,
    @InjectModel(NodeMembers.name)
    private readonly nodeMembersModel: Model<NodeMembers>,
    private readonly s3FileUpload: UploadService,
  ) {}

  /**
   * Creates a new project with associated files and permissions
   * @param createProjectDto - Data transfer object containing project details
   * @param userId - ID of user creating the project
   * @param documentFiles - Array of document files to be uploaded
   * @param bannerImage - Optional banner image file
   * @returns Newly created project document
   * @throws Error if required fields are missing or user lacks permissions
   */
  async create(
    createProjectDto: CreateProjectDto,
    userId: Types.ObjectId,
    documentFiles: Express.Multer.File[],
    bannerImage: Express.Multer.File | null,
  ) {
    try {
      // Log incoming files and data for debugging purposes
      console.log('Incoming Files:', {
        documentFiles,
        bannerImage,
        createProjectDto,
      });

      // Extract all required and optional fields from the DTO
      const {
        club,
        node,
        title,
        region,
        budget,
        deadline,
        significance,
        solution,
        committees,
        champions,
        aboutPromoters,
        fundingDetails,
        keyTakeaways,
        risksAndChallenges,
      } = createProjectDto;

      // Validate that title and either club or node are provided
      if (!title || (!club && !node)) {
        throw new Error('Missing required project details');
      }

      // Upload banner image and document files in parallel for better performance
      const [uploadedBannerImage, uploadedDocumentFiles] = await Promise.all([
        this.uploadFile(bannerImage),
        Promise.all(documentFiles.map((file) => this.uploadFile(file))),
      ]);

      // Create standardized file objects with metadata
      const fileObjects = uploadedDocumentFiles.map((file, index) => ({
        url: file.url,
        originalname: documentFiles[index].originalname,
        mimetype: documentFiles[index].mimetype,
        size: documentFiles[index].size,
      }));

      // Create banner image object if one was provided
      const uploadedBannerImageObject = bannerImage
        ? {
            url: uploadedBannerImage.url,
            originalname: bannerImage.originalname,
            mimetype: bannerImage.mimetype,
            size: bannerImage.size,
          }
        : null;

      // Construct base project data common to all project types
      const baseProjectData = {
        title,
        region,
        budget,
        deadline,
        significance,
        solution,
        committees,
        champions,
        aboutPromoters,
        fundingDetails,
        keyTakeaways,
        risksAndChallenges,
        bannerImage: uploadedBannerImageObject,
        files: fileObjects,
      };

      // Set up membership checking based on project type (club or node)
      let membershipModel = null;
      let membershipIdentifier = null;

      if (club) {
        membershipModel = this.clubMembersModel;
        membershipIdentifier = { club: new Types.ObjectId(club) };
      } else if (node) {
        membershipModel = this.nodeMembersModel;
        membershipIdentifier = { node: new Types.ObjectId(node) };
      }

      // Verify user membership and permissions if project belongs to club/node
      if (membershipModel) {
        const membership = await membershipModel.findOne({
          ...membershipIdentifier,
          member: new Types.ObjectId(userId),
        });

        if (!membership || !membership.role) {
          throw new Error('You are not a member of this group');
        }

        // Set project status based on user's role in the group
        const projectData = {
          ...baseProjectData,
          ...(club ? { club } : { node }),
          status: membership.role === 'member' ? 'proposed' : 'published',
        };

        const newProject = new this.projectModel(projectData);
        return await newProject.save();
      }

      // Create project as draft if not associated with club/node
      const newProject = new this.projectModel({
        ...baseProjectData,
        status: 'draft',
      });

      return await newProject.save();
    } catch (error) {
      console.error('Project creation error:', error);
      throw new Error(`Failed to create project: ${error.message}`);
    }
  }

  /**
   * Saves a project as draft with all associated files
   * Similar to create but specifically for draft status
   * @param updateProjectDto - Data transfer object with project updates
   * @param userId - ID of user saving the draft
   * @param documentFiles - Array of document files to upload
   * @param bannerImage - Optional banner image file
   * @returns Saved draft project
   * @throws Error if required fields are missing or user lacks permissions
   */
  async saveDraftProject(
    updateProjectDto: UpdateProjectDto,
    userId: Types.ObjectId,
    documentFiles: Express.Multer.File[],
    prevBannerImage: Express.Multer.File | null,
  ) {
    try {
      // Extract all fields from the update DTO
      const {
        club,
        node,
        title,
        region,
        budget,
        deadline,
        significance,
        solution,
        committees,
        champions,
        aboutPromoters,
        fundingDetails,
        keyTakeaways,
        risksAndChallenges,
        bannerImage,
        files,
      } = updateProjectDto;

      // Ensure required fields are present
      if (!title || (!club && !node)) {
        throw new Error('Missing required project details');
      }

      // Handle file uploads in parallel for efficiency
      const [uploadedBannerImage, uploadedDocumentFiles] = await Promise.all([
        this.uploadFile(prevBannerImage),
        Promise.all(documentFiles.map((file) => this.uploadFile(file))),
      ]);

      // Create standardized file objects with metadata
      const fileObjects = uploadedDocumentFiles.map((file, index) => ({
        url: file.url,
        originalname: documentFiles[index].originalname,
        mimetype: documentFiles[index].mimetype,
        size: documentFiles[index].size,
      }));

      // Process banner image if provided
      const uploadedBannerImageObject = prevBannerImage
        ? {
            url: uploadedBannerImage.url,
            originalname: prevBannerImage.originalname,
            mimetype: prevBannerImage.mimetype,
            size: prevBannerImage.size,
          }
        : null;

      // Construct base project data
      const baseProjectData = {
        title,
        region,
        budget,
        deadline,
        significance,
        solution,
        committees,
        champions,
        aboutPromoters,
        fundingDetails,
        keyTakeaways,
        risksAndChallenges,
        bannerImage: bannerImage ?? uploadedBannerImageObject,
        files: [...files, ...fileObjects],
      };

      // Determine membership model based on project type
      let membershipModel = null;
      let membershipIdentifier = null;

      if (club) {
        membershipModel = this.clubMembersModel;
        membershipIdentifier = { club: new Types.ObjectId(club) };
      } else if (node) {
        membershipModel = this.nodeMembersModel;
        membershipIdentifier = { node: new Types.ObjectId(node) };
      }

      // Verify user membership and permissions
      if (membershipModel) {
        const membership = await membershipModel.findOne({
          ...membershipIdentifier,
          member: new Types.ObjectId(userId),
        });

        if (!membership || !membership.role) {
          throw new Error('You are not a member of this group');
        }

        // Set project data with appropriate status
        const projectData = {
          ...baseProjectData,
          ...(club ? { club } : { node }),
          status: 'draft',
        };

        const newProject = new this.projectModel(projectData);
        return await newProject.save();
      }

      // Create project as draft if not associated with club/node
      const newProject = new this.projectModel({
        ...baseProjectData,
        status: 'draft',
      });

      return await newProject.save();
    } catch (error) {
      console.error('Project creation error:', error);
      throw new Error(`Failed to create project: ${error.message}`);
    }
  }

  /**
   * Uploads a file to S3 bucket
   * @param file - File to be uploaded
   * @returns Upload response containing file URL and metadata
   * @throws BadRequestException if upload fails
   */
  private async uploadFile(file: Express.Multer.File) {
    try {
      // Upload file to S3 using upload service
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
