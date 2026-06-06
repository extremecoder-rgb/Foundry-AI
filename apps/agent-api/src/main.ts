import * as dotenv from 'dotenv';
import { join } from 'path';
dotenv.config({ path: join(process.cwd(), '.env') }); // load root .env
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.PORT ?? 3002);
}
bootstrap();
