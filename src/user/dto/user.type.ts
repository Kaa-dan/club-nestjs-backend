import { Types } from 'mongoose';
import { User } from 'src/shared/entities/user.entity';

export type UserWithoutPassword = Omit<User, 'password'> & {
  _id: Types.ObjectId;
};
