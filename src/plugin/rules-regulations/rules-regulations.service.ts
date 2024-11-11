import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RulesRegulations } from 'src/shared/entities/rules-requlations.entity';
import { CreateRulesRegulationsDto } from './dto/rules-regulation.dto';
import { UploadService } from 'src/shared/upload/upload.service';

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
  ) {}

  /*
  
  */
  async getAllRulesRegulations() {
    try {
      return await this.rulesregulationModel.find().exec();
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
    console.log({ createRulesRegulationsDto });

    const { file: files, ...restData } = createRulesRegulationsDto;
    const uploadPromises = files.map((file: FileObject) =>
      this.uploadFile({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
      } as Express.Multer.File),
    );
    const uploadedFiles = await Promise.all(uploadPromises);

    const fileObjects = uploadedFiles.map((uploadedFile, index) => ({
      url: uploadedFile.url,
      originalname: files[index].originalname,
      mimetype: files[index].mimetype,
      size: files[index].size,
    }));
    console.log({ fileObjects });
    try {
      const newRulesRegulations = new this.rulesregulationModel({
        ...restData,
        file: fileObjects, // Save the file information in the schema
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

  /* ---------------------CREATE RULES AND REGULATIONS
  @Params :updateRulesRegulationDto
  @return :UpdatedRulesRegulations */

  async updateRulesRegulations(dataToSave: any) {
    // 1. Find the current version
    const currentVersion = await this.rulesregulationModel.findById(
      dataToSave._id,
    );

    if (!currentVersion) {
      throw new Error('Document not found');
    }

    // 2. Handle file uploads
    const { file, olderFile = [], ...restData } = dataToSave;
    const uploadedFiles = await Promise.all(
      file.map((singlefile) => this.uploadFile(singlefile)),
    );

    // 3. Create file objects
    const fileObjects = uploadedFiles.map((uploadedFile, index) => ({
      url: uploadedFile.url,
      originalname: file[index].originalname,
      mimetype: file[index].mimetype,
      size: file[index].size,
    }));

    try {
      // 4. Create a version object from the current document
      const versionObject = {
        ...currentVersion.toObject(),
        uniqid: new Types.ObjectId(),
        updatedAt: new Date(),
        version: currentVersion.version || 1,
      };

      // 5. Update the current document with new data
      const updatedDocument = await this.rulesregulationModel.findByIdAndUpdate(
        dataToSave._id,
        {
          $set: {
            ...restData,
            file: [...(olderFile || []), ...fileObjects],
            version: (currentVersion.version || 1) + 1,
            updatedAt: new Date(),
          },
          $push: {
            olderVersions: versionObject,
          },
        },
        { new: true, runValidators: true },
      );

      return updatedDocument;
    } catch (error) {
      console.error('Error updating rules and regulations:', error);
      throw new InternalServerErrorException(
        'Error while updating rules-regulations',
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
