import { awsUtils, ExecutionStatus } from '/opt/nodejs/index.js';

export const handler = async (event) => {
  // Iniciar ejecución
  const execution = await awsUtils.stepFunctions.startExecution({
    stateMachineArn: process.env.STATE_MACHINE_ARN,
    input: {
      userId: event.userId,
      processType: 'registration',
      metadata: event.metadata
    },
    name: `user-reg-${Date.now()}`
  });

  // Iniciar y esperar a que termine
  const result = await awsUtils.stepFunctions.startAndWait(
    {
      stateMachineArn: process.env.STATE_MACHINE_ARN,
      input: { userId: event.userId, action: 'process' }
    },
    {
      timeout: 120000, // 2 minutos
      onProgress: (exec) => {
        console.log(`Execution status: ${exec.status}`);
      }
    }
  );

  // Listar ejecuciones por estado
  const runningExecs = await awsUtils.stepFunctions.listRunningExecutions(
    process.env.STATE_MACHINE_ARN
  );

  // Enviar resultado a una tarea (para Step Functions con actividades)
  if (event.taskToken) {
    try {
      await awsUtils.stepFunctions.sendTaskSuccess(
        event.taskToken,
        { result: 'success', data: event.data }
      );
    } catch (error) {
      await awsUtils.stepFunctions.sendTaskFailure(
        event.taskToken,
        'Processing failed',
        error.message
      );
    }
  }

  return {
    executionArn: execution.executionArn,
    finalStatus: result.status,
    runningCount: runningExecs.executions.length
  };
};