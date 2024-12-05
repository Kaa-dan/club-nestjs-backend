import { Types } from 'mongoose';
import { Debate } from './debate.entity';
import { DebateArgument } from './debateArgument.entity';

interface DebateWithArguments extends Omit<Debate, 'arguments'> {
  args: {
    for: DebateArgument[];
    against: DebateArgument[];
  };
}

interface DebatesResponse {
  message: string;
  data: DebateWithArguments[];
}

type TPublishedStatus =
  | 'proposed'
  | 'published'
  | 'draft'
  | 'archieved'
  | 'rejected';
interface TFileObject {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}
