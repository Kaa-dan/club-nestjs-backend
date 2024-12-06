import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateProjectDto,
  UpdateProjectDto,
} from './dto/create-update-project.dto';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Project } from 'src/shared/entities/projects/project.entity';
import { NodeMembers } from 'src/shared/entities/node-members.entity';
import { UploadService } from 'src/shared/upload/upload.service';
import { Parameter } from 'src/shared/entities/projects/parameter.entity';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';
import { Faq } from 'src/shared/entities/projects/faq.enitity';

/**
 * Service responsible for managing all project-related operations
 * Handles CRUD operations for projects, file uploads, and associated data like FAQs and parameters
 */
@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(ClubMembers.name)
    private readonly clubMembersModel: Model<ClubMembers>,
    @InjectModel(NodeMembers.name)
    private readonly nodeMembersModel: Model<NodeMembers>,
    @InjectModel(Faq.name) private readonly faqModel: Model<Faq>,
    @InjectModel(Parameter.name)
    private readonly parameterModel: Model<Parameter>,
    private readonly s3FileUpload: UploadService,
    @InjectConnection() private connection: Connection,
  ) { }

  /**
   * Creates a new project with all associated data and files
   * Handles file uploads, permission checks, and data validation in a single transaction
   *
   * @param createProjectDto - Contains all project details like title, budget, etc
   * @param userId - ID of the user creating the project
   * @param documentFiles - Array of project-related documents to be uploaded
   * @param bannerImage - Project banner image file (optional)
   * @returns Newly created project with all associated data
   * @throws Error if validation fails or user lacks permissions
   */
  async create(
    createProjectDto: CreateProjectDto,
    userId: Types.ObjectId,
    documentFiles: Express.Multer.File[],
    bannerImage: Express.Multer.File | null,
  ) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Extract all fields from the DTO for easier access
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
        faqs,
        keyTakeaways,
        risksAndChallenges,
        parameters,
      } = createProjectDto;

      // Ensure required fields are present
      if (!title || (!club && !node)) {
        throw new Error('Missing required project details');
      }
      console.log({ parameters });

      // Handle file uploads concurrently for better performance
      const [uploadedBannerImage, uploadedDocumentFiles] = await Promise.all([
        bannerImage ? this.uploadFile(bannerImage) : null,
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
      const uploadedBannerImageObject = bannerImage
        ? {
          url: uploadedBannerImage.url,
          originalname: bannerImage.originalname,
          mimetype: bannerImage.mimetype,
          size: bannerImage.size,
        }
        : null;

      // Construct core project data
      const baseProjectData = {
        title,
        region,
        budget: JSON.parse(budget),
        deadline,
        significance,
        solution,
        committees: JSON.parse(committees as any),
        champions,
        faqs: JSON.parse(faqs as any),
        aboutPromoters,
        fundingDetails,
        keyTakeaways,
        risksAndChallenges,
        bannerImage: uploadedBannerImageObject,
        files: fileObjects,
      };

      // Determine membership type and verify permissions
      let membershipModel = null;
      let membershipIdentifier = null;

      if (club) {
        membershipModel = this.clubMembersModel;
        membershipIdentifier = { club: new Types.ObjectId(club) };
      } else if (node) {
        membershipModel = this.nodeMembersModel;
        membershipIdentifier = { node: new Types.ObjectId(node) };
      }

      // Verify user's membership and role
      let membership = null;
      if (membershipModel) {
        membership = await membershipModel.findOne({
          ...membershipIdentifier,
          user: new Types.ObjectId(userId),
        });

        if (!membership || !membership.role) {
          throw new Error('You are not a member of this group');
        }
      }

      // Set project status based on user's role
      const projectData = {
        ...baseProjectData,
        ...(club ? { club } : { node }),
        status: membershipModel
          ? membership.role === 'member'
            ? 'proposed'
            : 'published'
          : 'draft',
        createdBy: new Types.ObjectId(userId),
        publishedBy:
          membership.role !== 'member' ? new Types.ObjectId(userId) : null,
      };

      // Create and save the project
      const newProject = new this.projectModel(projectData);
      const savedProject = await newProject.save({ session });

      // Handle parameters if provided
      if (
        JSON.parse(parameters as any) &&
        JSON.parse(parameters as any).length > 0
      ) {
        const parametersToCreate = JSON.parse(parameters as any).map(
          (param) => {
            return {
              project: savedProject._id,
              ...param,
            };
          },
        );
        console.log({ parametersToCreate });
        const parameterValue = await this.parameterModel.create(
          parametersToCreate,
          { session },
        );

        console.log({ parameterValue });
      }

      // Handle FAQs if provided
      if (JSON.parse(faqs as any) && JSON.parse(faqs.length as any) > 0) {
        const faqsToCreate = JSON.parse(faqs as any).map((faq) => ({
          ...faq,
          project: savedProject._id,
          askedBy: userId,
          answeredBy: userId,
          status: 'proposed',
          Date: new Date(),
        }));

        await this.faqModel.create(faqsToCreate, { session });
      }

      // Commit all changes
      await session.commitTransaction();

      return savedProject;
    } catch (error) {
      // Rollback all changes if any operation fails
      await session.abortTransaction();
      console.error('Project creation error:', error);
      throw new Error(`Failed to create project: ${error.message}`);
    } finally {
      // Clean up database session
      session.endSession();
    }
  }

  /**
   * Saves a project as draft with all associated data
   * Similar to create but specifically handles draft status and updates
   *
   * @param updateProjectDto - Contains all project details to be updated
   * @param userId - ID of the user saving the draft
   * @param documentFiles - Array of project-related documents
   * @param prevBannerImage - Previous banner image if exists
   * @returns Saved draft project
   * @throws Error if validation fails or user lacks permissions
   */
  async saveDraftProject(
    updateProjectDto: UpdateProjectDto,
    userId: Types.ObjectId,
    documentFiles: Express.Multer.File[],
    prevBannerImage: Express.Multer.File | null,
  ) {
    const session = await this.connection.startSession();
    session.startTransaction();

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
        faqs,
        parameters,
      } = updateProjectDto;

      // Validate required fields
      if (!title || (!club && !node)) {
        throw new Error('Missing required project details');
      }

      // Process file uploads concurrently
      const [uploadedBannerImage, uploadedDocumentFiles] = await Promise.all([
        this.uploadFile(prevBannerImage),
        Promise.all(documentFiles.map((file) => this.uploadFile(file))),
      ]);

      // Create standardized file objects
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
        createdBy: new Types.ObjectId(userId),
      };

      // Determine membership type
      let membershipModel = null;
      let membershipIdentifier = null;

      if (club) {
        membershipModel = this.clubMembersModel;
        membershipIdentifier = { club: new Types.ObjectId(club) };
      } else if (node) {
        membershipModel = this.nodeMembersModel;
        membershipIdentifier = { node: new Types.ObjectId(node) };
      }

      // Verify user membership and handle project creation
      if (membershipModel) {
        const membership = await membershipModel.findOne({
          ...membershipIdentifier,
          member: new Types.ObjectId(userId),
        });

        if (!membership || !membership.role) {
          throw new Error('You are not a member of this group');
        }

        // Create project with membership data
        const projectData = {
          ...baseProjectData,
          ...(club ? { club } : { node }),
          status: 'draft',
        };

        const newProject = new this.projectModel(projectData);
        const savedProject = await newProject.save({ session });

        // Handle parameters if provided
        if (parameters && parameters.length > 0) {
          const parametersToCreate = parameters.map((param) => ({
            ...param,
            project: savedProject._id,
          }));

          await this.parameterModel.create(parametersToCreate, { session });
        }

        // Handle FAQs if provided
        if (faqs && faqs.length > 0) {
          const faqsToCreate = faqs.map((faq) => ({
            ...faq,
            project: savedProject._id,
            askedBy: userId,
            status: 'proposed',
            Date: new Date(),
          }));

          await this.faqModel.create(faqsToCreate, { session });
        }

        await session.commitTransaction();
        return savedProject;
      }

      // Handle project creation without membership
      const newProject = new this.projectModel({
        ...baseProjectData,
        status: 'draft',
      });

      const savedProject = await newProject.save({ session });

      // Handle parameters if provided
      if (parameters && parameters.length > 0) {
        const parametersToCreate = parameters.map((param) => ({
          ...param,
          project: savedProject._id,
        }));

        await this.parameterModel.create(parametersToCreate, { session });
      }

      // Handle FAQs if provided
      if (faqs && faqs.length > 0) {
        const faqsToCreate = faqs.map((faq) => ({
          ...faq,
          project: savedProject._id,
          askedBy: userId,
          status: 'proposed',
          Date: new Date(),
        }));

        await this.faqModel.create(faqsToCreate, { session });
      }

      await session.commitTransaction();
      return savedProject;
    } catch (error) {
      await session.abortTransaction();
      console.error('Project creation error:', error);
      throw new Error(`Failed to create project: ${error.message}`);
    } finally {
      session.endSession();
    }
  }

  /**
   * Updates an existing project with new data and files
   * Handles permission checks, file uploads, and associated data updates
   *
   * @param id - ID of the project to update
   * @param updateProjectDto - Contains all project details to be updated
   * @param userId - ID of the user making the update
   * @param documentFiles - New document files to be uploaded
   * @param bannerImage - New banner image if provided
   * @returns Updated project with all changes
   * @throws Error if project not found or user lacks permissions
   */
  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    userId: Types.ObjectId,
    documentFiles: Express.Multer.File[],
    bannerImage: Express.Multer.File | null,
  ) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Verify project exists
      const project = await this.projectModel.findById(id);
      if (!project) {
        throw new NotFoundException('Project not found');
      }

      // Determine membership type
      let membershipModel = null;
      let membershipIdentifier = null;

      if (project.club) {
        membershipModel = this.clubMembersModel;
        membershipIdentifier = { club: project.club };
      } else if (project.node) {
        membershipModel = this.nodeMembersModel;
        membershipIdentifier = { node: project.node };
      }

      // Verify user permissions
      let membership = null;
      if (membershipModel) {
        membership = await membershipModel.findOne({
          ...membershipIdentifier,
          user: userId,
        });

        if (!membership) {
          throw new Error('You are not a member of this group');
        }
      }

      // Extract update fields
      const {
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
        status,
        faqs,
        createdBy,
        parameters,
      } = updateProjectDto;

      // Handle status changes based on permissions
      let finalStatus = project.status;
      if (status) {
        const isAdmin = membership?.role === 'admin';
        if (isAdmin) {
          finalStatus = status;
        } else if (status !== 'publish') {
          finalStatus = status;
        } else {
          throw new Error(
            'You do not have permission to change project status',
          );
        }
      }

      // Process file uploads
      const [uploadedBannerImage, uploadedDocumentFiles] = await Promise.all([
        this.uploadFile(bannerImage),
        Promise.all(documentFiles.map((file) => this.uploadFile(file))),
      ]);

      // Create file objects with metadata
      const fileObjects = uploadedDocumentFiles.map((file, index) => ({
        url: file.url,
        originalname: documentFiles[index].originalname,
        mimetype: documentFiles[index].mimetype,
        size: documentFiles[index].size,
      }));

      // Process banner image
      const uploadedBannerImageObject = bannerImage
        ? {
          url: uploadedBannerImage.url,
          originalname: bannerImage.originalname,
          mimetype: bannerImage.mimetype,
          size: bannerImage.size,
        }
        : null;

      // Prepare update data
      const updateData = {
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
        status: finalStatus,
        publishedBy:
          membership.role !== 'member' && finalStatus === 'published'
            ? new Types.ObjectId(userId)
            : null,

        bannerImage: uploadedBannerImageObject || project.bannerImage,
        files: [...(project.files || []), ...fileObjects],
        createdBy,
      };

      // Update project document
      const updatedProject = await this.projectModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, session },
      );

      // Handle parameter updates
      if (parameters) {
        await this.parameterModel.deleteMany(
          { project: project._id },
          { session },
        );

        if (JSON.parse(parameters as any).length > 0) {
          const parametersToCreate = JSON.parse(parameters as any).map(
            (param) => ({
              ...param,
              project: project._id,
            }),
          );

          await this.parameterModel.create(parametersToCreate, { session });
        }
      }

      // Handle FAQ updates
      if (faqs) {
        await this.faqModel.deleteMany({ project: project._id }, { session });

        if (faqs.length > 0) {
          const faqsToCreate = faqs.map((faq) => ({
            ...faq,
            project: project._id,
            askedBy: userId,
            status: faq.status || 'proposed',
            Date: new Date(),
          }));

          await this.faqModel.create(faqsToCreate, { session });
        }
      }

      await session.commitTransaction();
      return updatedProject;
    } catch (error) {
      await session.abortTransaction();
      console.error('Project update error:', error);
      throw new Error(`Failed to update project: ${error.message}`);
    } finally {
      session.endSession();
    }
  }

  /**
   * Retrieves a single project with its associated FAQs and parameters
   * Implements pagination for FAQs and parameters
   *
   * @param id - Project ID to retrieve
   * @param page - Page number for pagination
   * @param limit - Number of items per page
   * @returns Project with paginated FAQs and parameters
   * @throws NotFoundException if project not found
   */
  async getSingleProject(id: Types.ObjectId) {
    try {


      const result = await this.projectModel.aggregate([
        {
          $match: {
            _id: new Types.ObjectId(id),
          },
        },
        // Lookup FAQs
        {
          $lookup: {
            from: 'faqs',
            localField: '_id',
            foreignField: 'project',
            pipeline: [
              { $sort: { createdAt: -1 } }, // Sort FAQs by creation date
            ],
            as: 'faqs',
          },
        },
        // Lookup parameters
        {
          $lookup: {
            from: 'parameters',
            let: { projectId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$project', '$$projectId'] },
                },
              },
              {
                $project: {
                  _id: 1,
                  title: 1,
                  value: 1,
                  unit: 1,
                  createdAt: 1,
                  updatedAt: 1,
                },
              },
            ],
            as: 'parameters',
          },
        },
        // Lookup contributions with parameter details
        {
          $lookup: {
            from: 'contributions',
            let: { projectId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$rootProject', '$$projectId'] }
                    ]
                  }
                }
              },
              // Lookup parameter details for each contribution
              {
                $lookup: {
                  from: 'parameters',
                  localField: 'parameter',
                  foreignField: '_id',
                  as: 'parameterDetails'
                }
              },
              {
                $unwind: '$parameterDetails'
              },
              {
                $project: {
                  value: 1,
                  status: 1,
                  files: 1,
                  parameter: 1,
                  parameterTitle: '$parameterDetails.title',
                  user: 1,
                  club: 1,
                  node: 1,
                  createdAt: 1
                }
              }
            ],
            as: 'contributions'
          }
        },
        // Add metadata
        {
          $addFields: {
            totalFaqs: { $size: '$faqs' },
            totalContributions: { $size: '$contributions' },
            totalParameters: { $size: '$parameters' },
            hasParameters: { $gt: [{ $size: '$parameters' }, 0] },
            contributionsByParameter: {
              $reduce: {
                input: '$contributions',
                initialValue: {},
                in: {
                  $mergeObjects: [
                    '$$value',
                    {
                      $arrayToObject: [
                        [
                          {
                            k: { $toString: '$$this.parameter' },
                            v: {
                              $concatArrays: [
                                {
                                  $ifNull: [
                                    { $getField: { input: '$$value', field: { $toString: '$$this.parameter' } } },
                                    []
                                  ]
                                },
                                ['$$this']
                              ]
                            }
                          }
                        ]
                      ]
                    }
                  ]
                }
              }
            }
          }
        },
        // Project specific fields
        {
          $project: {
            title: 1,
            region: 1,
            budget: 1,
            deadline: 1,
            significance: 1,
            solution: 1,
            committees: 1,
            champions: 1,
            faqs: 1,
            parameters: 1,
            aboutPromoters: 1,
            fundingDetails: 1,
            keyTakeaways: 1,
            risksAndChallenges: 1,
            bannerImage: 1,
            files: 1,
            status: 1,
            createdBy: 1,
            publishedBy: 1,
            totalFaqs: 1,
            totalParameters: 1,
            hasParameters: 1,
            totalContributions: 1,
            contributions: 1,
            contributionsByParameter: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ]);

      // Debug logging
      console.log('Query result:', JSON.stringify(result, null, 2));

      if (!result || result.length === 0) {
        throw new NotFoundException('Project not found');
      }

      // Debug: Check parameters and contributions
      const project = result[0];
      console.log('Parameters found:', project.parameters?.length || 0);
      console.log('Contributions found:', project.contributions?.length || 0);
      console.log('Contributions by Parameter:', project.contributionsByParameter);

      return project;
    } catch (error) {
      console.error('Error in getSingleProject:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException(
        `Failed to get single project: ${error.message}`,
      );
    }
  }
  /**
   * Retrieves all projects in the system
   * @returns Array of all projects
   * @throws BadRequestException if query fails
   */
  /**
   * Retrieves a paginated list of projects based on provided filters
   * @param status - Filter projects by status ('proposed' or 'published')
   * @param page - Page number for pagination
   * @param limit - Number of items per page
   * @param isActive - Filter by project active status
   * @param search - Optional search term to filter projects by title, region or significance
   * @param node - Optional node ID to filter projects by node
   * @param club - Optional club ID to filter projects by club
   * @returns Object containing paginated projects list and pagination metadata
   * @throws BadRequestException if query fails
   */
  async getAllProjects(
    status: 'proposed' | 'published',
    page: number,
    limit: number,
    isActive: boolean,
    search: string,
    node?: Types.ObjectId,
    club?: Types.ObjectId,
  ) {
    try {
      const query: any = {
        status,
        // active: isActive,
      };

      if (node) {
        query.node = node;
      }

      if (club) {
        query.club = club;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { region: { $regex: search, $options: 'i' } },
          { significance: { $regex: search, $options: 'i' } },
        ];
      }

      const projects = await this.projectModel
        .find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('node', 'name')
        .populate('club', 'name')
        .populate('createdBy', 'userName profileImage firstName lastName');

      console.log({ query, projects });

      const total = await this.projectModel.countDocuments(query);

      return {
        projects,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to get all projects. Please try again later.',
      );
    }
  }
  /**
   * Retrieves all projects where the user is listed as a champion
   * @param userId - ID of the user to find projects for
   * @returns Array of projects where user is a champion
   */
  async getMyProjects(
    userId: Types.ObjectId,
    page: number,
    limit: number,
    node?: Types.ObjectId,
    club?: Types.ObjectId,
  ) {
    try {
      const query: any = {
        createdBy: userId,
      };

      if (node) {
        query.node = node;
      }

      if (club) {
        query.club = club;
      }

      const projects = await this.projectModel
        .find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('node', 'name')
        .populate('club', 'name')
        .populate('createdBy', 'userName profileImage firstName lastName');

      const total = await this.projectModel.countDocuments(query);

      return {
        projects,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to get my projects. Please try again later.',
      );
    }
  }

  async getGlobalProjects(page: number, limit: number) {
    try {
      const projects = await this.projectModel
        .find({ status: 'published' })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('node', 'name')
        .populate('club', 'name')
        .populate('createdBy', 'userName profileImage firstName lastName');

      const total = await this.projectModel.countDocuments({
        status: 'published',
      });

      return {
        projects,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to get my projects. Please try again later.',
      );
    }
  }

  /**
   * Handles file upload to S3 storage
   * @param file - File to be uploaded
   * @returns Upload response with file URL and metadata
   * @throws BadRequestException if upload fails
   */
  private async uploadFile(file: Express.Multer.File) {
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
