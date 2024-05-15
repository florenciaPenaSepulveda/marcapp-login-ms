import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class CorreosService {
  constructor(private readonly mailerService: MailerService) {}

  sendMail(): void {
    this.mailerService.sendMail({
      to: 'rajni90@mailinator.com',
      from: 'rajni901@mailinator.com',
      subject: 'Testing Nest MailerModule',
      text: 'welcome',
      html: '<b>welcome to sending email via nest js node mailer</b>',
    });
  }
}
