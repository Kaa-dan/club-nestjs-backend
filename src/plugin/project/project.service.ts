import { Injectable } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-update-project.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project } from 'src/shared/entities/projects/project.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    userId: Types.ObjectId,
    documentFiles: Express.Multer.File[],
    bannerImage: Express.Multer.File | null,
  ) {
    try {
      console.log({ createProjectDto, userId, documentFiles, bannerImage });
      const newProject = new this.projectModel(createProjectDto);

      return await newProject.save();
    } catch (error) {
      throw new Error('Error while creating project');
    }
  }
}
