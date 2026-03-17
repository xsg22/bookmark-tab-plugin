import { getWorkflows } from './settings-service.js';

// 当前阶段只提供最小工作流读取能力，
// 后续如果要支持编辑器，可以继续扩展这一层。
export async function getWorkflowItems() {
  const workflows = await getWorkflows();
  return workflows.map((workflow) => ({
    ...workflow,
    title: workflow.title || workflow.trigger || workflow.id
  }));
}
