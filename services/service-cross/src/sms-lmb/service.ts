import { SNSService, ResponseFactory, MESSAGES_SUCCESS } from 'ly-nodejs-ts-common';
import { SmsRequest } from './models';

export default class Service {

  static async sendSms(payload: SmsRequest): Promise<any> {
    try {
      const snsService = new SNSService();
      const messageId = await snsService.publishToPhone(payload.phoneNumber, payload.message);
      return ResponseFactory.success(
        { messageId },
        MESSAGES_SUCCESS.PROCESS_SUCCESS
      );
    } catch (err: any) {
      console.error('sendSms >>> ', err);
      return ResponseFactory.fromError(err);
    }
  }
}
