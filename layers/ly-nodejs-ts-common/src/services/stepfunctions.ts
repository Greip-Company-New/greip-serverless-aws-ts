import { 
  SFNClient, 
  StartExecutionCommand,
  DescribeExecutionCommand,
  StopExecutionCommand,
  ListExecutionsCommand,
  SendTaskSuccessCommand,
  SendTaskFailureCommand,
  SendTaskHeartbeatCommand,
  ExecutionStatus
} from '@aws-sdk/client-sfn';
import { Logger, retry } from '../utils.js';
import type { StepFunctionsStartParams, StepFunctionsResult } from '../types.js';

export class StepFunctionsService {
  private client: SFNClient;
  private logger: Logger;

  constructor() {
    this.client = new SFNClient({
      maxAttempts: 3,
      retryMode: 'standard'
    });
    this.logger = new Logger('StepFunctionsService');
  }

  async startExecution(params: StepFunctionsStartParams): Promise<StepFunctionsResult> {
    try {
      this.logger.debug('Starting execution', { 
        stateMachineArn: params.stateMachineArn,
        name: params.name 
      });
      
      const command = new StartExecutionCommand({
        stateMachineArn: params.stateMachineArn,
        input: params.input ? JSON.stringify(params.input) : undefined,
        name: params.name
      });

      const response = await retry(() => this.client.send(command));
      
      return {
        executionArn: response.executionArn!,
        startDate: response.startDate!
      };
      
    } catch (error) {
      this.logger.error('Error starting execution', error);
      throw error;
    }
  }

  async describeExecution(executionArn: string): Promise<any> {
    try {
      this.logger.debug('Describing execution', { executionArn });
      
      const command = new DescribeExecutionCommand({
        executionArn
      });

      const response = await retry(() => this.client.send(command));
      
      return {
        executionArn: response.executionArn,
        stateMachineArn: response.stateMachineArn,
        name: response.name,
        status: response.status,
        startDate: response.startDate,
        stopDate: response.stopDate,
        input: response.input ? JSON.parse(response.input) : null,
        output: response.output ? JSON.parse(response.output) : null,
        error: response.error,
        cause: response.cause
      };
      
    } catch (error) {
      this.logger.error('Error describing execution', error);
      throw error;
    }
  }

  async stopExecution(executionArn: string, cause?: string, error?: string): Promise<Date> {
    try {
      this.logger.debug('Stopping execution', { executionArn, cause });
      
      const command = new StopExecutionCommand({
        executionArn,
        cause,
        error
      });

      const response = await retry(() => this.client.send(command));
      return response.stopDate!;
      
    } catch (error) {
      this.logger.error('Error stopping execution', error);
      throw error;
    }
  }

  async listExecutions(
    stateMachineArn: string, 
    statusFilter?: ExecutionStatus,
    maxResults?: number,
    nextToken?: string
  ): Promise<{ executions: any[]; nextToken?: string }> {
    try {
      this.logger.debug('Listing executions', { stateMachineArn, statusFilter });
      
      const command = new ListExecutionsCommand({
        stateMachineArn,
        statusFilter,
        maxResults,
        nextToken
      });

      const response = await retry(() => this.client.send(command));
      
      return {
        executions: response.executions || [],
        nextToken: response.nextToken
      };
      
    } catch (error) {
      this.logger.error('Error listing executions', error);
      throw error;
    }
  }

  async listExecutionsWithFilter(
    stateMachineArn: string, 
    statusFilter?: string,
    maxResults?: number,
    nextToken?: string
  ): Promise<{ executions: any[]; nextToken?: string }> {
    // Convertir string a ExecutionStatus si es válido
    const validStatuses: ExecutionStatus[] = [
      'RUNNING',
      'SUCCEEDED',
      'FAILED',
      'TIMED_OUT',
      'ABORTED'
    ];
    
    const executionStatus = statusFilter && validStatuses.includes(statusFilter as ExecutionStatus)
      ? statusFilter as ExecutionStatus
      : undefined;
    
    return this.listExecutions(stateMachineArn, executionStatus, maxResults, nextToken);
  }

  async listRunningExecutions(
    stateMachineArn: string, 
    maxResults?: number,
    nextToken?: string
  ): Promise<{ executions: any[]; nextToken?: string }> {
    return this.listExecutions(stateMachineArn, 'RUNNING', maxResults, nextToken);
  }

  async listSucceededExecutions(
    stateMachineArn: string, 
    maxResults?: number,
    nextToken?: string
  ): Promise<{ executions: any[]; nextToken?: string }> {
    return this.listExecutions(stateMachineArn, 'SUCCEEDED', maxResults, nextToken);
  }

  async listFailedExecutions(
    stateMachineArn: string, 
    maxResults?: number,
    nextToken?: string
  ): Promise<{ executions: any[]; nextToken?: string }> {
    return this.listExecutions(stateMachineArn, 'FAILED', maxResults, nextToken);
  }

  async listTimedOutExecutions(
    stateMachineArn: string, 
    maxResults?: number,
    nextToken?: string
  ): Promise<{ executions: any[]; nextToken?: string }> {
    return this.listExecutions(stateMachineArn, 'TIMED_OUT', maxResults, nextToken);
  }

  async listAbortedExecutions(
    stateMachineArn: string, 
    maxResults?: number,
    nextToken?: string
  ): Promise<{ executions: any[]; nextToken?: string }> {
    return this.listExecutions(stateMachineArn, 'ABORTED', maxResults, nextToken);
  }

  async getAllExecutions(
    stateMachineArn: string,
    statusFilter?: ExecutionStatus
  ): Promise<any[]> {
    let allExecutions: any[] = [];
    let nextToken: string | undefined;

    do {
      const result = await this.listExecutions(
        stateMachineArn, 
        statusFilter, 
        100,
        nextToken
      );
      
      allExecutions = allExecutions.concat(result.executions);
      nextToken = result.nextToken;
    } while (nextToken);

    return allExecutions;
  }

  async sendTaskSuccess(taskToken: string, output: any): Promise<void> {
    try {
      this.logger.debug('Sending task success', { taskToken });
      
      const command = new SendTaskSuccessCommand({
        taskToken,
        output: JSON.stringify(output)
      });

      await retry(() => this.client.send(command));
      
    } catch (error) {
      this.logger.error('Error sending task success', error);
      throw error;
    }
  }

  async sendTaskFailure(taskToken: string, error?: string, cause?: string): Promise<void> {
    try {
      this.logger.debug('Sending task failure', { taskToken, error });
      
      const command = new SendTaskFailureCommand({
        taskToken,
        error,
        cause
      });

      await retry(() => this.client.send(command));
      
    } catch (error) {
      this.logger.error('Error sending task failure', error);
      throw error;
    }
  }

  async sendTaskHeartbeat(taskToken: string): Promise<void> {
    try {
      this.logger.debug('Sending task heartbeat', { taskToken });
      
      const command = new SendTaskHeartbeatCommand({
        taskToken
      });

      await retry(() => this.client.send(command));
      
    } catch (error) {
      this.logger.error('Error sending task heartbeat', error);
      throw error;
    }
  }

  async waitForExecution(
    executionArn: string, 
    interval: number = 5000, 
    timeout: number = 300000
  ): Promise<any> {
    try {
      this.logger.debug('Waiting for execution', { executionArn, timeout });
      
      const startTime = Date.now();
      
      while (Date.now() - startTime < timeout) {
        const execution = await this.describeExecution(executionArn);
        
        if (['SUCCEEDED', 'FAILED', 'TIMED_OUT', 'ABORTED'].includes(execution.status)) {
          return execution;
        }
        
        await new Promise(resolve => setTimeout(resolve, interval));
      }
      
      throw new Error(`Timeout waiting for execution: ${executionArn}`);
      
    } catch (error) {
      this.logger.error('Error waiting for execution', error);
      throw error;
    }
  }

  async waitForExecutionWithPolling(
    executionArn: string,
    options: {
      interval?: number;
      timeout?: number;
      onProgress?: (execution: any) => void;
    } = {}
  ): Promise<any> {
    const interval = options.interval || 5000;
    const timeout = options.timeout || 300000;
    
    try {
      this.logger.debug('Waiting for execution with polling', { executionArn, timeout });
      
      const startTime = Date.now();
      
      while (Date.now() - startTime < timeout) {
        const execution = await this.describeExecution(executionArn);
        
        // Llamar al callback de progreso si está definido
        if (options.onProgress) {
          options.onProgress(execution);
        }
        
        if (['SUCCEEDED', 'FAILED', 'TIMED_OUT', 'ABORTED'].includes(execution.status)) {
          this.logger.info('Execution completed', { 
            executionArn, 
            status: execution.status 
          });
          return execution;
        }
        
        this.logger.debug('Execution still running', { 
          executionArn, 
          status: execution.status,
          elapsed: Date.now() - startTime 
        });
        
        await new Promise(resolve => setTimeout(resolve, interval));
      }
      
      throw new Error(`Timeout waiting for execution: ${executionArn}`);
      
    } catch (error) {
      this.logger.error('Error waiting for execution with polling', error);
      throw error;
    }
  }

  async getExecutionOutput<T = any>(executionArn: string): Promise<T | null> {
    try {
      const execution = await this.describeExecution(executionArn);
      
      if (execution.status !== 'SUCCEEDED') {
        throw new Error(`Execution ${executionArn} is not succeeded. Status: ${execution.status}`);
      }
      
      return execution.output as T;
      
    } catch (error) {
      this.logger.error('Error getting execution output', error);
      throw error;
    }
  }

  async getExecutionError(executionArn: string): Promise<{ error: string; cause?: string } | null> {
    try {
      const execution = await this.describeExecution(executionArn);
      
      if (execution.status !== 'FAILED' && execution.status !== 'TIMED_OUT' && execution.status !== 'ABORTED') {
        throw new Error(`Execution ${executionArn} is not in a failed state. Status: ${execution.status}`);
      }
      
      return {
        error: execution.error || 'Unknown error',
        cause: execution.cause
      };
      
    } catch (error) {
      this.logger.error('Error getting execution error', error);
      throw error;
    }
  }

  async startAndWait(
    params: StepFunctionsStartParams,
    options: {
      interval?: number;
      timeout?: number;
      onProgress?: (execution: any) => void;
    } = {}
  ): Promise<any> {
    try {
      this.logger.debug('Starting execution and waiting for completion', { 
        stateMachineArn: params.stateMachineArn 
      });
      
      // Iniciar la ejecución
      const result = await this.startExecution(params);
      
      // Esperar a que complete
      const execution = await this.waitForExecutionWithPolling(result.executionArn, {
        interval: options.interval,
        timeout: options.timeout,
        onProgress: options.onProgress
      });
      
      return execution;
      
    } catch (error) {
      this.logger.error('Error starting and waiting for execution', error);
      throw error;
    }
  }
}