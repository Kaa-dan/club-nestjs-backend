import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
export default () => ({
  DATABASE_URL: process.env.DATABASE,
});

export const ENV = {
  DATABASE_URL: process.env.DATABASE,
  JWT_SECRET: process.env.JWT_SECRET,
  PORT: process.env.PORT,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.API_SECRET,
};
