import {
  BadRequestException,
  Inject,
  Injectable,
  NotAcceptableException,
  NotFoundException,
  UnauthorizedException,
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
import { ProjectParameter } from 'src/shared/entities/projects/parameter.entity';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';
import { ProjectFaq } from 'src/shared/entities/projects/faq.enitity';
import { ProjectContribution } from 'src/shared/entities/projects/contribution.entity';
import { PopulatedProject } from './project.interface';
import { AnswerFaqDto, CreateDtoFaq } from './dto/faq.dto';
import { ProjectAdoption } from 'src/shared/entities/projects/project-adoption.entity';
import { ChapterProject } from 'src/shared/entities/chapters/modules/chapter-projects';

/**
 * Service responsible for managing all project-related operations
 * Handles CRUD operations for projects, file uploads, and associated data like FAQs and parameters
 */
@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(ProjectAdoption.name)
    private readonly projectAdoptionModel: Model<ProjectAdoption>,
    @InjectModel(ClubMembers.name)
    private readonly clubMembersModel: Model<ClubMembers>,
    @InjectModel(NodeMembers.name)
    private readonly nodeMembersModel: Model<NodeMembers>,
    @InjectModel(ProjectFaq.name) private readonly faqModel: Model<ProjectFaq>,
    @InjectModel(ProjectParameter.name)
    private readonly parameterModel: Model<ProjectParameter>,
    @InjectModel(ProjectContribution.name)
    private readonly contributionModel: Model<ProjectContribution>,
    private readonly s3FileUpload: UploadService,
    @InjectConnection() private connection: Connection,
    @InjectModel(ChapterProject.name) private readonly chapterProjectModel: Model<ChapterProject>,
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
        ...(club ? { club: new Types.ObjectId(club) } : {}),
        ...(node ? { node: new Types.ObjectId(node) } : {}),
        status: membershipModel
          ? membership.role === 'member'
            ? 'proposed'
            : 'published'
          : 'draft',
        createdBy: new Types.ObjectId(userId),
        publishedBy: membership.role !== 'member' ? new Types.ObjectId(userId) : null,
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
        const parameterValue = await this.parameterModel.create(
          parametersToCreate,
          { session },
        );
      }

      // Handle FAQs if provided
      if (JSON.parse(faqs as any) && JSON.parse(faqs.length as any) > 0) {
        const faqsToCreate = JSON.parse(faqs as any).map((faq) => ({
          ...faq,
          project: savedProject._id,
          askedBy: userId,
          answeredBy: userId,
          status: 'approved',
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
  async getSingleProject(id: string | Types.ObjectId) {
    try {
      const projectId = typeof id === 'string' ? new Types.ObjectId(id) : id;

      const result = await this.projectModel.aggregate([
        {
          $match: {
            _id: projectId
          }
        },
        // Lookup creator details
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'creatorDetails',
            pipeline: [
              {
                $project: {
                  userName: 1,
                  firstName: 1,
                  lastName: 1,
                  profileImage: 1,
                  email: 1
                }
              }
            ]
          }
        },
        {
          $unwind: {
            path: '$creatorDetails',
            preserveNullAndEmptyArrays: true
          }
        },
        // Lookup parameters
        {
          $lookup: {
            from: 'parameters',
            localField: '_id',
            foreignField: 'project',
            as: 'parameters'
          }
        },
        // Get only accepted contributions
        {
          $lookup: {
            from: 'contributions',
            let: { paramIds: '$parameters._id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ['$parameter', '$$paramIds'] },
                      { $eq: ['$status', 'accepted'] }  // Only get accepted contributions
                    ]
                  }
                }
              },
              // Join with parameters
              {
                $lookup: {
                  from: 'parameters',
                  localField: 'parameter',
                  foreignField: '_id',
                  as: 'parameterDetails'
                }
              },
              // Join with users
              {
                $lookup: {
                  from: 'users',
                  localField: 'user',
                  foreignField: '_id',
                  as: 'contributorDetails'
                }
              },
              // Join with clubs
              {
                $lookup: {
                  from: 'clubs',
                  localField: 'club',
                  foreignField: '_id',
                  as: 'clubDetails'
                }
              },
              // Unwind arrays
              {
                $unwind: {
                  path: '$parameterDetails',
                  preserveNullAndEmptyArrays: true
                }
              },
              {
                $unwind: {
                  path: '$contributorDetails',
                  preserveNullAndEmptyArrays: true
                }
              },
              {
                $unwind: {
                  path: '$clubDetails',
                  preserveNullAndEmptyArrays: true
                }
              },
              // Project needed fields
              {
                $project: {
                  _id: 1,
                  parameter: 1,
                  value: 1,
                  files: 1,
                  createdAt: 1,
                  parameterDetails: {
                    _id: 1,
                    title: 1,
                    value: 1
                  },
                  contributorDetails: {
                    _id: 1,
                    userName: 1,
                    profileImage: 1
                  },
                  clubDetails: {
                    _id: 1,
                    name: 1,
                    logo: 1
                  },
                  node: 1,
                  rootProject: 1
                }
              }
            ],
            as: 'contributions'
          }
        },
        // Calculate totals
        {
          $addFields: {
            totalParameters: { $size: '$parameters' },
            hasParameters: { $gt: [{ $size: '$parameters' }, 0] },
            totalContributors: {
              $size: {
                $setUnion: '$contributions.contributorDetails._id'
              }
            },
            totalAcceptedValue: {
              $reduce: {
                input: '$contributions',
                initialValue: 0,
                in: { $add: ['$$value', '$$this.value'] }
              }
            }
          }
        },
        // Final projection
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
            aboutPromoters: 1,
            fundingDetails: 1,
            keyTakeaways: 1,
            risksAndChallenges: 1,
            bannerImage: 1,
            files: 1,
            status: 1,
            createdBy: '$creatorDetails',
            publishedBy: 1,
            parameters: 1,
            contributions: 1,
            totalParameters: 1,
            hasParameters: 1,
            totalContributors: 1,
            totalAcceptedValue: 1,
            createdAt: 1,
            updatedAt: 1
          }
        }
      ]);

      if (!result || result.length === 0) {
        throw new NotFoundException('Project not found');
      }

      return result[0];
    } catch (error) {
      console.error('Error in getSingleProject:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get project: ${error.message}`);
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

      if (node) query.node = node;
      else if (club) query.club = club;

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { region: { $regex: search, $options: 'i' } },
          { significance: { $regex: search, $options: 'i' } },
        ];
      }

      const total = await this.projectModel.countDocuments(query);

      const projects = await this.projectModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('node', 'name profileImage')
        .populate('club', 'name profileImage')
        .populate('createdBy', 'userName profileImage firstName lastName');

      if (node) query.node = new Types.ObjectId(node);
      else query.club = new Types.ObjectId(club);

      const adoptedProjects = await this.projectAdoptionModel
        .find(query)
        .populate('node', 'name profileImage')
        .populate('club', 'name profileImage')
        .populate('proposedBy', 'userName profileImage firstName lastName')
        .populate(
          'project',
          '-club -node -status -proposedBy -acceptedBy -createdAt -updatedAt',
        );

      return {
        projects,
        adoptedProjects,
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

  async getChapterAllProjects(
    status: 'proposed' | 'published',
    page: number,
    limit: number,
    isActive: boolean,
    search: string,
    chapter?: Types.ObjectId,
  ): Promise<any> {
    try {
      const query: any = { status };

      if (chapter) query.chapter = new Types.ObjectId(chapter);

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { region: { $regex: search, $options: 'i' } },
          { significance: { $regex: search, $options: 'i' } },
        ];
      }

      // Get direct projects
      const projects = await this.projectModel
        .find()
        .sort({ createdAt: -1 })
        .populate('node', 'name profileImage')
        .populate('club', 'name profileImage')
        .populate('createdBy', 'userName profileImage firstName lastName')
        .lean(); // Use lean() to get plain JavaScript objects

      // Get chapter projects
      const chapterProjects = await this.chapterProjectModel
        .find(query)
        .populate({
          path: 'project',
          populate: [
            { path: 'node', select: 'name profileImage' },
            { path: 'club', select: 'name profileImage' },
            { path: 'createdBy', select: 'userName profileImage firstName lastName' }
          ]
        })
        .populate('chapter', 'name profileImage')
        .lean(); // Use lean() to get plain JavaScript objects

      // Transform chapter projects
      const transformedChapterProjects = chapterProjects.map(cp => ({
        ...cp.project,
        chapter: cp.chapter,
        chapterProjectId: cp._id,
        createdAt: cp.createdAt
      }));

      // Merge and sort
      const allProjects = [...projects, ...transformedChapterProjects]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Calculate pagination
      const total = allProjects.length;
      const startIndex = (page - 1) * limit;
      const paginatedProjects = allProjects.slice(startIndex, startIndex + limit);

      return {
        projects: paginatedProjects,
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

      if (node) query.node = node;
      else if (club) query.club = club;

      const projects = await this.projectModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('node', 'name')
        .populate('club', 'name')
        .populate('createdBy', 'userName profileImage firstName lastName');

      const total = await this.projectModel.countDocuments(query);

      delete query.createdBy;
      query.proposedBy = userId;
      if (node) query.node = new Types.ObjectId(node);
      else if (club) query.club = new Types.ObjectId(club);

      const adoptedProjects = await this.projectAdoptionModel
        .find(query)
        .populate('node', 'name profileImage')
        .populate('club', 'name profileImage')
        .populate('proposedBy', 'userName profileImage firstName lastName')
        .populate(
          'project',
          '-club -node -status -proposedBy -acceptedBy -createdAt -updatedAt',
        );

      return {
        projects,
        adoptedProjects,
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
   *
   * @param page
   * @param limit
   * @returns
   */
  async getGlobalProjects(page: number, limit: number) {
    try {
      const projects = await this.projectModel
        .find({ status: 'published' })
        .sort({ createdAt: -1 })
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
   *Retrieves all contributions and parameter of Project
   * @param user - id of the user
   * @param projectId - id of the project
   * @returns  single project with all parametes and contributions with total accepted contibution and pending contribution field
   */

  async getContributions(
    userId: Types.ObjectId,
    projectId: Types.ObjectId,
    status: 'accepted' | 'pending' | 'rejected',
  ) {
    try {

      const query = [
        {
          $match: {
            _id: new Types.ObjectId(projectId),
          },
        },
        {
          $lookup: {
            from: 'parameters',
            localField: '_id',
            foreignField: 'project',
            as: 'parameters',
          },
        },
        {
          $unwind: '$parameters',
        },
        {
          $lookup: {
            from: 'contributions',
            let: {
              parameterId: '$parameters._id',
              userId: new Types.ObjectId(userId),
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$parameter', '$$parameterId'] },
                      { $eq: ['$status', status] },
                    ],
                  },
                },
              },
              {
                $group: {
                  _id: '$parameter',
                  contributions: { $push: '$$ROOT' },
                  totalValue: { $sum: '$value' },
                  contributionCount: { $sum: 1 },
                },
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'contributions.user',
                  foreignField: '_id',
                  as: 'userDetails',
                },
              },
            ],
            as: 'contributions',
          },
        },
      ];

      console.log({ query });

      const data = await this.projectModel.aggregate(query);

      console.log(JSON.stringify(data));

      return data;

    } catch (error) {

      throw new BadRequestException(
        `Error while trying to fetch contributions: ${error?.message}`,
      );

    }
  }

  /**
   * Accepts pending contributions
   * @param  userId- id of the user
   * @param contributionId  - id of the contribution
   * @returns  updated contributions
   *
   */
  async acceptOrRejectContributions(
    userId: Types.ObjectId,
    contributionId: Types.ObjectId,
    type: boolean,
  ) {
    try {
      // Properly typed population
      console.log({ contributionId });
      const contributionDetails: any = await this.contributionModel
        .findById(contributionId)
        .populate('project', 'createdBy')
        .lean();
      // Check if contribution exists
      if (!contributionDetails) {
        throw new NotAcceptableException('CONTRIBUTION NOT FOUND');
      }

      console.log('contri ', contributionDetails);
      console.log('uiiiid ', userId.toString());

      // Check if the user is the project creator
      if (
        !contributionDetails.project ||
        contributionDetails?.project?.createdBy.toString() !== userId.toString()
        // 'abc' !== userId.toString()
      ) {
        throw new UnauthorizedException(
          'You are not authorized to accept this contribution',
        );
      }

      // Update contribution status in a single operation
      const result = await this.contributionModel.findByIdAndUpdate(
        contributionId,
        {
          status: type ? 'accepted' : 'rejected',
          publishedBy: userId,
        },
        { new: true },
      );

      return {
        status: true,
        message: 'Contribution accepted',
        data: result,
      };
    } catch (error) {
      console.log({ error });

      throw new BadRequestException(
        'Error while accepting contributions',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   *
   * @param userID
   * @param projectId
   * @param type
   * @returns
   */
  async acceptOrRejectProposedProjectInForum(
    userID: Types.ObjectId,
    projectId: Types.ObjectId,
    type: 'accept' | 'reject',
    creationType: 'proposed' | 'creation'
  ) {


    try {
      if (creationType == 'creation') {
        return await this.projectModel.findByIdAndUpdate(
          new Types.ObjectId(projectId),
          {
            status: type === 'accept' ? 'published' : 'rejected',
            publishedBy: userID,
          },
        );
      } else {
        // console.log({ creationType });

        return await this.projectAdoptionModel.updateOne(
          { project: new Types.ObjectId(projectId) }, // Query to find the document
          {
            $set: {
              status: type === 'accept' ? 'published' : 'rejected', // Update the status field
              publishedBy: userID, // Update the publishedBy field
            },
          }
        );

      }

    } catch (error) {

      throw new BadRequestException('error while accepting project', error);
    }
  }

  /**
   *
   * @param userId
   * @param createFaqDto
   * @returns
   */
  async askFaq(userId: Types.ObjectId, createFaqDto: CreateDtoFaq) {
    try {
      if (!userId && !createFaqDto.projectId) {
        throw new BadRequestException('user and project id not found');
      }

      //creating faq
      const createdFaq = await this.faqModel.create({
        Date: new Date(),
        status: 'proposed',
        askedBy: new Types.ObjectId(userId),
        question: createFaqDto.question,
        project: createFaqDto.projectId,
      });

      return {
        status: 'success',
        data: createdFaq,
        message: 'faq created succesfully',
      };
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  /**
   *
   * @param projectId
   * @returns
   */
  async getQuestionFaq(projectId: Types.ObjectId) {
    try {
      const getAllFaqQuestions = await this.faqModel
        .find({ project: new Types.ObjectId(projectId), status: 'proposed' })
        .populate({ path: 'askedBy', select: 'userName email profilePicture' });

      return {
        message: 'data fetched successfully',
        data: getAllFaqQuestions,
        status: true,
      };
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  /**
   *
   * @param userId
   * @param answerFaqDto
   * @returns
   */

  async answerFaq(userId: Types.ObjectId, answerFaqDto: AnswerFaqDto) {
    try {
      //checking if the user is the creator
      const isCreater = await this.projectModel.find({
        _id: new Types.ObjectId(answerFaqDto.project),
        createdBy: userId,
      });
      if (!isCreater) {
        throw new UnauthorizedException(
          'your are not authorized to answer this faq',
        );
      }
      //answering faq
      const answeredFaq = await this.faqModel.findByIdAndUpdate(
        new Types.ObjectId(answerFaqDto.faq),
        { answer: answerFaqDto.answer, status: answerFaqDto.status },
      );

      return { data: answeredFaq, status: false, message: 'faq answered' };
    } catch (error) {
      throw new BadRequestException(error);
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


  async reactToPost(postId: string, userId: string, action: 'like' | 'dislike') {
    if (!['like', 'dislike'].includes(action)) {
      throw new BadRequestException('Invalid action. Use "like" or "dislike".');
    }

    const userObjectId = new Types.ObjectId(userId);

    // First, ensure the document exists and initialize arrays if needed
    const existingPost = await this.projectModel.findByIdAndUpdate(
      postId,
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

    if (!existingPost) {
      throw new BadRequestException('Post not found.');
    }

    // Now perform the reaction update in a separate operation
    let updateQuery;

    if (action === 'like') {
      const isLiked = existingPost.relevant?.some(entry => entry?.user?.equals(userObjectId));

      if (isLiked) {
        // Remove like
        updateQuery = {
          $pull: {
            relevant: { user: userObjectId }
          }
        };
      } else {
        // Add like and remove from irrelevant
        updateQuery = {
          $addToSet: {
            relevant: {
              user: userObjectId,
              date: new Date()
            }
          },
          $pull: {
            irrelevant: { user: userObjectId }
          }
        };
      }
    } else {
      const isDisliked = existingPost.irrelevant?.some(entry => entry?.user?.equals(userObjectId));

      if (isDisliked) {
        // Remove dislike
        updateQuery = {
          $pull: {
            irrelevant: { user: userObjectId }
          }
        };
      } else {
        // Add dislike and remove from relevant
        updateQuery = {
          $addToSet: {
            irrelevant: {
              user: userObjectId,
              date: new Date()
            }
          },
          $pull: {
            relevant: { user: userObjectId }
          }
        };
      }
    }

    // Execute the update
    const updatedPost = await this.projectModel.findByIdAndUpdate(
      postId,
      updateQuery,
      { new: true }
    );

    return {
      message: `Post has been ${action}d successfully.`,
      data: updatedPost
    };
  }

}
