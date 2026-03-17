// ProviderRegistry 统一决定“这个 query 该交给谁处理”。
// 这样后续扩展新的搜索源时，只需要注册新 provider。

export class ProviderRegistry {
  constructor(providers = []) {
    this.providers = providers;
  }

  register(provider) {
    this.providers.push(provider);
  }

  resolve(intent) {
    return this.providers.filter((provider) => provider.supports(intent));
  }
}

