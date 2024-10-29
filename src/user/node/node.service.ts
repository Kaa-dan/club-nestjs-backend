import { Injectable } from '@nestjs/common';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';
import { Node_, NodeSchema } from 'src/shared/entities/node.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UploadService } from 'src/shared/upload/upload.service';
import { ServiceResponse } from 'src/shared/types/service.response.type';

@Injectable()
export class NodeService {
  constructor(
    @InjectModel(Node_.name) private readonly nodeModel: Model<Node_>,
    private readonly uploadService: UploadService,
  ) {}

  async create(createNodeDto: CreateNodeDto) {
    const { name, about, description, location, profileImage, coverImage } =
      createNodeDto;
    const profileImageUpload = this.uploadService.uploadFile(
      profileImage.buffer,
      'node',
    );
    const coverImageUpload = this.uploadService.uploadFile(
      coverImage.buffer,
      'node',
    );
    const [profileImageResult, coverImageResult] = await Promise.all([
      profileImageUpload,
      coverImageUpload,
    ]);
    const node = new this.nodeModel({
      name,
      about,
      description,
      location,
      profileImage: profileImageResult.url,
      coverImage: coverImageResult.url,
    });
    await node.save();
    return 'Successfully added a new node';
  }

  async findAll() {
    const nodes = await this.nodeModel.find();
    return nodes;
  }

  async findOne(nodeId: string) {
    const node = await this.nodeModel.findById(nodeId);
    return node;
  }

  update(id: string, updateNodeDto: UpdateNodeDto) {
    return `This action updates a #${id} node`;
  }

  remove(id: number) {
    return `This action removes a #${id} node`;
  }
}
