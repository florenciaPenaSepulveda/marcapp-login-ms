import { Module } from '@nestjs/common';
import { CorreosController } from './correos.controller';
import { CorreosService } from './correos.service';
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: 'smtp.gmail.com',
        auth: {
          user: 'flopi2801@gmail.com',
          pass: 'CONTRASENA_ELIMINADA',
        },
      },
    }),
  ],
  controllers: [CorreosController],  
  providers: [CorreosService],
  exports: [CorreosService],
})
export class CorreosModule {}
