import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFiles,
  ValidationPipe,
} from '@nestjs/common';
import { IssuesService } from './issues.service';
import { FileValidationPipe } from 'src/shared/pipes/file-validation.pipe';
import { CreateIssuesDto } from './dto/create-issue.dto';
import { SkipAuth } from 'src/decorators/skip-auth.decorator';
@SkipAuth()
@Controller('issues')
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  /**
   * POST / => Create Issue
   * GET / => Get All Issues
   * GET /:id => Get Issue by ID
   * PUT /:id => Update Issue by ID
   * DELETE /:id => Delete Issue by ID
   * GET /user/:userId => Get Issues by User ID
   * GET /club/:clubId => Get Issues by Club ID
   * GET /node/:nodeId => Get Issues by Node ID
   */

  @Post()
  async createIssue(
    @Req() req: Request,
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
          required: true,
        },
      }),
    )
    files: Express.Multer.File[],
    @Body(ValidationPipe) createIssuesData: CreateIssuesDto,
  ) {
    console.log('heheh', createIssuesData);
    return await this.issuesService.createIssue(createIssuesData);
  }

  @Get()
  getAllIssues() {
    return 'getting all issues';
  }
}
