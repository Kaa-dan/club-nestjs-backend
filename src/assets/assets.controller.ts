import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';

import { AssetsService } from './assets.service';
import { Request } from 'express';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) { }

  @Get('feed')
  async getFeed(@Query('entity') entity: 'club' | 'node', @Query('entityId') entityId: string) {
    return this.assetsService.getAssetsByEntity(entity, entityId);
  }


  @Post('relevancy')
  async toggleRelevancy(
    @Body() body: {
      type: 'projects' | 'issues',
      moduleId: string,
      action: 'like' | 'dislike'
    },
    @Req() request: Request
  ) {
    return this.assetsService.feedRelevancyAction(
      body.type,
      body.moduleId,
      body.action,
      request.user._id
    );
  }
}
