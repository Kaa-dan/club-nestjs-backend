import { Controller, Get, Query } from '@nestjs/common';

import { AssetsService } from './assets.service';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('feed')
  async getFeed(@Query() query) {
    return this.assetsService.getFeed(query);
  }
}
