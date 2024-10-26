import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as multer from 'multer';

@Injectable()
export class FileUploadMiddleware implements NestMiddleware {
  private upload: any;

  constructor() {
    const storage = multer.memoryStorage();
    this.upload = multer({
      storage,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/^image\/(jpg|jpeg|png|gif)$/)) {
          cb(null, true);
        } else {
          // cb(
          //   new Error('Only image files (jpg, jpeg, png, gif) are allowed!'),
          //   false,
          // );
        }
      },
    }).fields([
      { name: 'profileImage', maxCount: 1 },
      { name: 'coverImage', maxCount: 1 },
    ]);
  }

  use(req: Request, res: Response, next: NextFunction) {
    this.upload(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({
          message: err.message,
        });
      }
      next();
    });
  }
}
