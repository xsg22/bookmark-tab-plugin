// ActionRegistry 管理所有可执行动作。
// 当前 UI 先只用默认动作，后续要做“展开更多动作”时也能复用这层。

export class ActionRegistry {
  constructor(actions = []) {
    this.actionsById = new Map();
    actions.forEach((action) => this.register(action));
  }

  register(action) {
    this.actionsById.set(action.id, action);
  }

  get(actionId) {
    return this.actionsById.get(actionId) || null;
  }
}

