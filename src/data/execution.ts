import { useEffect, useMemo, useState } from "react";
import WorkflowDAG from "../components/diagram/WorkflowDAG";
import { WorkflowDef } from "../types/workflowDef";
import { Execution, ExecutionAndTasks, TaskResult } from "../types/execution";
import { useFetch } from "./common";
import useAppContext from "../hooks/useAppContext";
import { useQueries, useQueryClient } from "react-query";

export function useWorkflow(workflowId: string) {
  const { stack } = useAppContext();
  return useFetch<Execution>(
    [stack, "workflow", workflowId],
    `/workflow/${workflowId}`,
    {
      enabled: !!workflowId,
    },
  );
}

export function useWorkflowVariables(workflowId: string) {
  const { stack } = useAppContext();
  return useFetch(
    [stack, "workflow", workflowId],
    `/workflow/${workflowId}`, 
    {
      enabled: !!workflowId,
      select: (data)=>data.variables
    },
  );
}

export function useWorkflowOutput(workflowId: string) {
  const { stack } = useAppContext();
  return useFetch(
    [stack, "workflow", workflowId],
    `/workflow/${workflowId}`,
    {
      enabled: !!workflowId,
      select: (data)=>data.output
    },
  );
}

export function useWorkflowInput(workflowId: string) {
  const { stack } = useAppContext();
  return useFetch(
    [stack, "workflow", workflowId],
    `/workflow/${workflowId}`,
    {
      enabled: !!workflowId,
      select: (data)=>data.input
    },
  );
}

export function useInvalidateExecution(workflowId: string) {
  const client = useQueryClient();
  const { stack } = useAppContext();

  return () => client.invalidateQueries([stack, "workflow", workflowId]);
}

// TODO: Should be done in backend for true interoperability.
export function useExecutionAndTasks(workflowId: string): {
  executionAndTasks: ExecutionAndTasks | undefined;
  loading: boolean;
  error: any;
} {
  const { fetchWithContext, ready, stack } = useAppContext();
  const [state, setState] = useState<ExecutionAndTasks | undefined>(undefined);

  const results = useQueries([
    {
      queryKey: [stack, "workflow", workflowId],
      queryFn: () => fetchWithContext(`/workflow/${workflowId}`),
      enabled: ready,
    },
    {
      queryKey: [stack, "workflow", workflowId, "tasks"],
      queryFn: () => fetchWithContext(`/workflow/${workflowId}`).then(data=>data.tasks),
      enabled: ready,
    },
  ]);

  useEffect(() => {
    if (results[0].isFetching || results[1].isFetching) {
      setState(undefined);
    } else if (results[0].isSuccess && results[1].isSuccess) {
      console.log("Updating workflow and tasks");
      // Note: In place sort
      results[1].data.sort(
        (a: TaskResult, b: TaskResult) => a.scheduledTime! - b.scheduledTime!,
      );

      setState({
        execution: results[0].data,
        tasks: results[1].data,
      });
    }
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [
    results[0].isSuccess,
    results[1].isSuccess,
    results[0].isFetching,
    results[1].isFetching,
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */
  return {
    error: results[0].error,
    executionAndTasks: state,
    loading:
      results[0].isLoading ||
      results[1].isLoading ||
      results[0].isFetching ||
      results[1].isFetching,
  };
}

export function useWorkflowDag(executionAndTasks?: ExecutionAndTasks) {
  return useMemo(() => {
    return executionAndTasks?.execution && executionAndTasks?.tasks
      ? WorkflowDAG.fromExecutionAndTasks(executionAndTasks)
      : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionAndTasks?.execution, executionAndTasks?.tasks]);
}

export function useWorkflowDagFromDef(workflowDefinition?: WorkflowDef) {
  return useMemo(() => {
    return workflowDefinition
      ? WorkflowDAG.fromWorkflowDef(workflowDefinition)
      : undefined;
  }, [workflowDefinition]);
}

export function useWorkflowTask(
  workflowId?: string,
  taskReferenceName?: string,
  taskId?: string,
) {
  let path = `/task/${taskId}`;

  const key = ["task", taskId];

  return useFetch(key, path, {
    enabled: !!taskId,
    keepPreviousData: false,
  });
}

export function useWorkflowTaskOutput(
  workflowId?: string,
  taskReferenceName?: string,
  taskId?: string,
) {
  let path = `/task/${taskId}/`;
  return useFetch(
    ["task", taskId!],
    path,
    {
      enabled: !!taskId,
      select: (data)=>data.outputData
    },
  );
}

export function useWorkflowTaskInput(
  workflowId?: string,
  taskReferenceName?: string,
  taskId?: string,
) {
  let path = `/tasks/${taskId}`;

  return useFetch(
    ["task", taskId],
    path,
    {
      enabled: !!taskId,
      select: (data)=>data.inputData
    },
  );
}
