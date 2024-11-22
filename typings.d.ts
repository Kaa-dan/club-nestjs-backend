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
