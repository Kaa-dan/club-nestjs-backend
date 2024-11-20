import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Issues } from 'src/shared/entities/issues.entity';
import { UploadService } from 'src/shared/upload/upload.service';
import { CreateIssuesDto } from './dto/create-issue.dto';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';
import { NodeMembers } from 'src/shared/entities/node-members.entity';
import { publish } from 'rxjs';

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
  ) { }

  /**
   * Create a new issue. This function will also handle the upload of any files
   * associated with the issue.
   *
   * @param issueData - The create issue data
   * @returns The newly created issue
   */
  async createIssue(issueData: CreateIssuesDto) {
    const { files: files, node, club, ...restData } = issueData;
    let fileObjects = null
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

      let fileObjects = null
      let mergedFiles = [files]

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
          }
        )

        return updateData;
      }

      // Check if the user is an admin or not
      const memberRole = await this.getMemberRoles(userId, dataToSave);

      // If the user is not an admin, update the document to proposed
      if (memberRole !== 'admin') {
        const updateData = await this.issuesModel.findByIdAndUpdate(
          dataToSave._id,
          {
            $set: {
              ...restData,
              files: mergedFiles,
              publishedStatus: 'proposed',
            },
          }
        )

        return updateData;
      }


      // If the user is an admin, update the document to published
      const versionObject = {
        ...currentVersion.toObject(),
        version: currentVersion.version || 1,
        files: mergedFiles,
        publishedStatus: 'olderversion'
      }

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
          }
        },
        { new: true, runValidators: true }
      )

      return updatedDocument


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
      let query = {}; // Initialize the query object    
      if (entity === 'node') {
        query = {
          node: entityId,
          isActive: true
        };
      } else {
        query = {
          club: entityId,
          isActive: true
        };
      }
      return await this.issuesModel
        .find(query)
        .populate('createdBy', '-password')
        .exec();
    } catch (error) {
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
  async getMyIssues(userId: Types.ObjectId, entity: 'node' | 'club', entityId: Types.ObjectId) {
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

  async getMemberRoles(userId: Types.ObjectId, createIssuesData: any) {
    try {

      if (createIssuesData.node) {
        const memberInfo = await this.nodeMembersModel.findOne({
          node: new Types.ObjectId(createIssuesData.node),
          user: new Types.ObjectId(userId),
        })
        console.log(memberInfo)
        return memberInfo.role
      }

      const memberInfo = await this.clubMembersModel.findOne({
        club: new Types.ObjectId(createIssuesData.club),
        user: new Types.ObjectId(userId),
      })
      console.log(memberInfo)
      return memberInfo.role


    } catch (error) {

      console.log(error)
      throw new InternalServerErrorException(
        'Error while getting user roles',
        error,
      );
    }
  }
}
