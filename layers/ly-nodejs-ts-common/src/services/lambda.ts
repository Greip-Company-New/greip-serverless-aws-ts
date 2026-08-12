import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { Logger, retry } from '../utils.js';
import type { LambdaInvokeParams, LambdaInvokeResult } from '../types.js';

export class LambdaService {
    private clients: Map<string, LambdaClient>;
    private logger: Logger;

    constructor() {
        this.clients = new Map();
        this.logger = new Logger('LambdaService');
    }

    private getClient(region?: string): LambdaClient {
        const targetRegion = region || process.env.AWS_REGION || 'us-east-1';
        if (!this.clients.has(targetRegion)) {
            this.clients.set(
                targetRegion,
                new LambdaClient({
                    region: targetRegion,
                    maxAttempts: 3,
                    retryMode: 'standard'
                })
            );
        }
        return this.clients.get(targetRegion)!;
    }

    /**
     * Invokes an external Lambda function.
     * @param params 
     * @returns 
     */
    async invokeLambda(params: LambdaInvokeParams): Promise<LambdaInvokeResult> {
        try {
            this.logger.debug('Invoking Lambda', {
                functionName: params.functionName,
                region: params.region,
                invocationType: params.invocationType
            });

            const client = this.getClient(params.region);

            const payload = typeof params.payload === 'string'
                ? params.payload
                : JSON.stringify(params.payload);

            const command = new InvokeCommand({
                FunctionName: params.functionName,
                Payload: Buffer.from(payload),
                InvocationType: params.invocationType || 'RequestResponse'
            });

            const response: any = await retry(() => client.send(command));

            let responsePayload: any = null;
            if (response.Payload) {
                const payloadString = Buffer.from(response.Payload).toString('utf-8');
                try {
                    responsePayload = JSON.parse(payloadString);
                } catch {
                    responsePayload = payloadString;
                }
            }

            return {
                statusCode: response.StatusCode || 200,
                payload: responsePayload,
                executedVersion: response.ExecutedVersion,
                error: response.FunctionError
            };

        } catch (error: any) {
            // this.logger.error('Error invoking Lambda', error);
            throw error;
        }
    }
}
