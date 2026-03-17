import { BUILTIN_COMMANDS, PALETTE_SOURCES } from '../../shared/palette-constants.js';
import { normalizeText } from '../../shared/query-utils.js';

export class CommandProvider {
  constructor() {
    this.id = 'command-provider';
  }

  supports(intent) {
    // 空输入时展示常用命令；
    // 输入 / 时则展示 slash command 建议。
    return intent.mode === 'global' || intent.mode === 'command';
  }

  async search(intent) {
    if (intent.mode === 'global') {
      // 没有关键字时展示命令入口，给用户一个可发现的起点。
      if (intent.keyword) return [];

      return BUILTIN_COMMANDS.map((command, index) => ({
        id: `command:${command.id}`,
        source: PALETTE_SOURCES.COMMAND,
        title: command.title,
        subtitle: command.placeholder,
        score: 90 - index,
        usageCount: 0,
        lastUsedAt: 0,
        defaultActionId: 'apply-command',
        actionIds: ['apply-command'],
        payload: {
          commandId: command.id,
          nextQuery: `/${command.id} `
        }
      }));
    }

    const normalizedToken = normalizeText(intent.commandToken);
    const matchingCommands = BUILTIN_COMMANDS.filter((command) => {
      if (!normalizedToken) return true;
      if (command.id.includes(normalizedToken)) return true;
      return command.aliases.some((alias) => alias.includes(normalizedToken));
    });

    // 如果命令已经完整匹配且用户开始输入参数，就不再重复展示命令列表。
    if (intent.command && intent.keyword) {
      return [];
    }

    return matchingCommands.map((command, index) => ({
      id: `command:${command.id}`,
      source: PALETTE_SOURCES.COMMAND,
      title: command.title,
      subtitle: `${command.placeholder} · ${command.description}`,
      score: 140 - index,
      usageCount: 0,
      lastUsedAt: 0,
      defaultActionId: 'apply-command',
      actionIds: ['apply-command'],
      payload: {
        commandId: command.id,
        nextQuery: `/${command.id} `
      }
    }));
  }
}
