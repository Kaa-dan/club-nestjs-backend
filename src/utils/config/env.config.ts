import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
export default () => ({
  DATABASE_URL: process.env.DATABASE,
});

export const ENV = {
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION,
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  DATABASE_URL: process.env.DATABASE,
  JWT_SECRET: process.env.JWT_SECRET,
  PORT: process.env.PORT,
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  DEFAULT_FROM_EMAIL: process.env.DEFAULT_FROM_EMAIL,
  DEFAULT_FROM_NAME: process.env.DEFAULT_FROM_NAME,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.API_SECRET,
  UI_URL: process.env.UI_URL,
  TOKEN_EXPIRY_TIME: '7d',
};
