import { 
  EventBridgeClient, 
  PutEventsCommand,
  PutRuleCommand,
  PutTargetsCommand,
  RemoveTargetsCommand,
  DeleteRuleCommand,
  ListRulesCommand,
  ListTargetsByRuleCommand
} from '@aws-sdk/client-eventbridge';
import { Logger, retry } from '../utils.js';
import type { EventBridgePutParams, EventBridgeResult } from '../types.js';

export class EventBridgeService {
  private client: EventBridgeClient;
  private logger: Logger;

  constructor() {
    this.client = new EventBridgeClient({
      maxAttempts: 3,
      retryMode: 'standard'
    });
    this.logger = new Logger('EventBridgeService');
  }

  async putEvent(params: EventBridgePutParams): Promise<EventBridgeResult> {
    try {
      this.logger.debug('Putting event', { 
        source: params.source, 
        detailType: params.detailType 
      });
      
      const command = new PutEventsCommand({
        Entries: [{
          EventBusName: params.eventBusName,
          Source: params.source,
          DetailType: params.detailType,
          Detail: typeof params.detail === 'string' 
            ? params.detail 
            : JSON.stringify(params.detail),
          Resources: params.resources,
          Time: params.time || new Date()
        }]
      });

      const response = await retry(() => this.client.send(command));
      
      return {
        eventId: response.Entries?.[0]?.EventId || '',
        successfulEntryCount: response.Entries?.length || 0,
        failedEntryCount: response.FailedEntryCount || 0
      };
      
    } catch (error) {
      this.logger.error('Error putting event', error);
      throw error;
    }
  }

  async putEvents(entries: EventBridgePutParams[]): Promise<EventBridgeResult> {
    try {
      this.logger.debug('Putting multiple events', { count: entries.length });
      
      const command = new PutEventsCommand({
        Entries: entries.map(entry => ({
          EventBusName: entry.eventBusName,
          Source: entry.source,
          DetailType: entry.detailType,
          Detail: typeof entry.detail === 'string' 
            ? entry.detail 
            : JSON.stringify(entry.detail),
          Resources: entry.resources,
          Time: entry.time || new Date()
        }))
      });

      const response = await retry(() => this.client.send(command));
      
      return {
        eventId: response.Entries?.[0]?.EventId || '',
        successfulEntryCount: response.Entries?.length || 0,
        failedEntryCount: response.FailedEntryCount || 0
      };
      
    } catch (error) {
      this.logger.error('Error putting multiple events', error);
      throw error;
    }
  }

  async putRule(
    name: string, 
    eventPattern?: any, 
    scheduleExpression?: string,
    description?: string
  ): Promise<string> {
    try {
      this.logger.debug('Putting rule', { name, scheduleExpression });
      
      const command = new PutRuleCommand({
        Name: name,
        EventPattern: eventPattern ? JSON.stringify(eventPattern) : undefined,
        ScheduleExpression: scheduleExpression,
        Description: description,
        State: 'ENABLED'
      });

      const response = await retry(() => this.client.send(command));
      return response.RuleArn!;
      
    } catch (error) {
      this.logger.error('Error putting rule', error);
      throw error;
    }
  }

  async putTargets(ruleName: string, targets: any[], eventBusName?: string): Promise<void> {
    try {
      this.logger.debug('Putting targets', { ruleName, targetsCount: targets.length });
      
      const command = new PutTargetsCommand({
        Rule: ruleName,
        EventBusName: eventBusName,
        Targets: targets
      });

      await retry(() => this.client.send(command));
      
    } catch (error) {
      this.logger.error('Error putting targets', error);
      throw error;
    }
  }

  async removeTargets(ruleName: string, targetIds: string[], eventBusName?: string): Promise<void> {
    try {
      this.logger.debug('Removing targets', { ruleName, targetIds });
      
      const command = new RemoveTargetsCommand({
        Rule: ruleName,
        EventBusName: eventBusName,
        Ids: targetIds
      });

      await retry(() => this.client.send(command));
      
    } catch (error) {
      this.logger.error('Error removing targets', error);
      throw error;
    }
  }

  async deleteRule(ruleName: string, eventBusName?: string, force: boolean = false): Promise<void> {
    try {
      this.logger.debug('Deleting rule', { ruleName, force });
      
      if (force) {
        // Primero eliminar targets
        const targets = await this.listTargets(ruleName, eventBusName);
        if (targets.length > 0) {
          await this.removeTargets(
            ruleName, 
            targets.map(t => t.Id!), 
            eventBusName
          );
        }
      }

      const command = new DeleteRuleCommand({
        Name: ruleName,
        EventBusName: eventBusName
      });

      await retry(() => this.client.send(command));
      
    } catch (error) {
      this.logger.error('Error deleting rule', error);
      throw error;
    }
  }

  async listRules(eventBusName?: string): Promise<any[]> {
    try {
      this.logger.debug('Listing rules', { eventBusName });
      
      const command = new ListRulesCommand({
        EventBusName: eventBusName
      });

      const response = await retry(() => this.client.send(command));
      return response.Rules || [];
      
    } catch (error) {
      this.logger.error('Error listing rules', error);
      throw error;
    }
  }

  async listTargets(ruleName: string, eventBusName?: string): Promise<any[]> {
    try {
      this.logger.debug('Listing targets', { ruleName });
      
      const command = new ListTargetsByRuleCommand({
        Rule: ruleName,
        EventBusName: eventBusName
      });

      const response = await retry(() => this.client.send(command));
      return response.Targets || [];
      
    } catch (error) {
      this.logger.error('Error listing targets', error);
      throw error;
    }
  }
}