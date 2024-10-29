import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
  UsePipes,
  Put,
  BadRequestException,
} from '@nestjs/common';
import { NodeService } from './node.service';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from 'src/shared/pipes/file-validation.pipe';

@Controller('node')
export class NodeController {
  constructor(private readonly nodeService: NodeService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'profileImage', maxCount: 1 },
      { name: 'coverImage', maxCount: 1 },
    ]),
  )
  @UsePipes(
    new FileValidationPipe({
      profileImage: {
        maxSizeMB: 2,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg'],
        required: true,
      },
      coverImage: {
        maxSizeMB: 2,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg'],
        required: true,
      },
    }),
  )
  create(
    @Body()
    createNodeBody: {
      name: string;
      about: string;
      description: string;
      location: string;
      modules: string[];
    },
    @UploadedFiles()
    files: {
      profileImage?: Express.Multer.File[];
      coverImage?: Express.Multer.File[];
    },
  ) {
    console.log('Files', files);
    if (!files.profileImage?.[0] || !files.coverImage?.[0]) {
      throw new BadRequestException(
        'Both profile and cover images are required',
      );
    }

    return this.nodeService.create({
      ...createNodeBody,
      profileImage: files.profileImage[0],
      coverImage: files.coverImage[0],
    });
  }

  @Get()
  findAll() {
    return this.nodeService.findAll();
  }

  @Get(':nodeId')
  findOne(@Param('nodeId') id: string) {
    return this.nodeService.findOne(id);
  }

  @Put(':nodeId')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'profileImage', maxCount: 1 },
      { name: 'coverImage', maxCount: 1 },
    ]),
  )
  @UsePipes(
    new FileValidationPipe({
      profileImage: {
        maxSizeMB: 2,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg'],
        required: true,
      },
      coverImage: {
        maxSizeMB: 2,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg'],
        required: true,
      },
    }),
  )
  update(
    @Param('nodeId') id: string,
    @Body()
    updateNodeBody: {
      name: string;
      about: string;
      description: string;
      location: string;
      modules: string[];
    },
    @UploadedFiles()
    files: {
      profileImage?: Express.Multer.File[];
      coverImage?: Express.Multer.File[];
    },
  ) {
    return this.nodeService.update(id, {
      ...updateNodeBody,
      profileImage: files.profileImage?.[0],
      coverImage: files.coverImage?.[0],
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.nodeService.remove(+id);
  }
}
