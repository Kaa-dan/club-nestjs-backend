import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UploadedFiles,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AdoptContributionService } from './adopt-contribution.service';
import { CreateAdoptContributionDto } from './dto/create-adopt-contribution.dto';
import { UpdateAdoptContributionDto } from './dto/update-adopt-contribution.dto';
import { ProjectFiles } from 'src/decorators/project-file-upload/project-files.decorator';
import { FileValidationPipe } from 'src/shared/pipes/file-validation.pipe';

@Controller('adopt-contribution')
export class AdoptContributionController {
  constructor(
    private readonly adoptContributionService: AdoptContributionService,
  ) { }

  @Post()
  @ProjectFiles()
  create(
    @Body() createAdoptContributionDto: CreateAdoptContributionDto,
    @Req() { user },
    @UploadedFiles(
      new FileValidationPipe({
        files: {
          maxSizeMB: 5,
          allowedMimeTypes: [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
          required: false,
        },
      }),
    )
    files: { file: Express.Multer.File[] },
  ) {
    return this.adoptContributionService.create(
      createAdoptContributionDto,
      user._id,
      files,
    );
  }

  @Post('adopt-forum')
  adoptForum(@Req() { user }, @Body() adoptForumDto: { project: Types.ObjectId, node?: Types.ObjectId, club?: Types.ObjectId }) {
    return this.adoptContributionService.adoptForum(user._id, adoptForumDto);
  }

  @Get('not-adopted-forum/:projectId')
  notAdoptedForum(
    @Req() { user },
    @Param('projectId') projectId: Types.ObjectId,
  ) {
    return this.adoptContributionService.notAdoptedForum(user._id, projectId);
  }
}
