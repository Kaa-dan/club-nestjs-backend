import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-update-project.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project } from 'src/shared/entities/projects/project.entity';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';
import { NodeMembers } from 'src/shared/entities/node-members.entity';
import { UploadService } from 'src/shared/upload/upload.service';

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

  async create(
    createProjectDto: CreateProjectDto,
    userId: Types.ObjectId,
    documentFiles: Express.Multer.File[],
    bannerImage: Express.Multer.File | null,
  ) {
    console.log({ bannerImage });

    try {
      // Log incoming data for debugging
      console.log('Incoming Files:', {
        documentFiles,
        bannerImage,
        createProjectDto,
      });
      // Destructure input with default values and validation
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
      } = createProjectDto;
      // Validate input early
      if (!title || (!club && !node)) {
        throw new Error('Missing required project details');
      }

      // Parallel file uploads
      const [uploadedBannerImage, uploadedDocumentFiles] = await Promise.all([
        this.uploadFile(bannerImage),
        Promise.all(documentFiles.map((file) => this.uploadFile(file))),
      ]);

      // Create file objects with mapping
      const fileObjects = uploadedDocumentFiles.map((file, index) => ({
        url: file.url,
        originalname: documentFiles[index].originalname,
        mimetype: documentFiles[index].mimetype,
        size: documentFiles[index].size,
      }));

      const uploadedBannerImageObject = bannerImage
        ? {
            url: uploadedBannerImage.url,
            originalname: bannerImage.originalname,
            mimetype: bannerImage.mimetype,
            size: bannerImage.size,
          }
        : null;

      // Common project data
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

      // Determine user membership and project status
      let membershipModel = null;
      let membershipIdentifier = null;

      if (club) {
        // console.log('club is here');

        membershipModel = this.clubMembersModel;
        membershipIdentifier = { club: new Types.ObjectId(club) };
      } else if (node) {
        membershipModel = this.nodeMembersModel;
        membershipIdentifier = { node: new Types.ObjectId(node) };
      }

      // Check user membership if applicable
      if (membershipModel) {
        console.log('member ship model', membershipIdentifier);

        const membership = await membershipModel.findOne({
          ...membershipIdentifier,
          user: new Types.ObjectId(userId),
        });
        console.log({ HEy: membership });

        if (!membership || !membership.role) {
          throw new Error('You are not a member of this group');
        }

        // Determine project status based on user role
        const projectData = {
          ...baseProjectData,
          ...(club ? { club } : { node }),
          status: membership.role === 'member' ? 'proposed' : 'published',
        };

        const newProject = new this.projectModel(projectData);
        return await newProject.save();
      }

      // Fallback project creation if no club or node
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
