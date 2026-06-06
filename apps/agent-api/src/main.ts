import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
const envPaths = [
  path.resolve(__dirname, '../../../.env'), // ts-node-dev
  path.resolve(__dirname, '../../../../.env'), // dist
  path.resolve(process.cwd(), '../../.env'), // fallback workspace
  path.resolve(process.cwd(), '.env') // fallback root
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.PORT ?? 3002);
}
bootstrap();
