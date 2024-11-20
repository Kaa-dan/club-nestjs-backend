import { Controller, Post, Body, Param, Get, Req, Put } from '@nestjs/common';

import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationService } from './invitation.service';
import { Request } from 'express';
import { Types } from 'mongoose';

@Controller('invitation')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Get()
  getInvitations(@Req() req: Request) {
    return this.invitationService.getInvitations(req.user._id);
  }
  @Post()
  createInvitation(
    @Req() req: Request,
    @Body() createInvitationDto: CreateInvitationDto,
  ) {
    return this.invitationService.createInvitation(
      createInvitationDto,
      req.user._id,
    );
  }

  @Put('acceptOrReject/:invitationId/:accept')
  acceptInvitation(
    @Req() req: Request,
    @Param('invitationId') invitationId: Types.ObjectId,
    @Param('accept') accept: boolean,
  ) {
    console.log('nithin');
    return this.invitationService.acceptInvitation(
      invitationId,
      req.user._id,
      accept,
    );
  }
}
