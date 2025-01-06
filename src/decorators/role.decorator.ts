import { SetMetadata } from '@nestjs/common';

type reqRoles = 'owner' | 'admin' | 'moderator' | 'member';

export const Roles = (...roles: reqRoles[]) => SetMetadata('roles', roles);
