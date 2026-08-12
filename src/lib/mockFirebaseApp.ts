export function initializeApp(config: any, name?: string) {
  return { name: name || "[DEFAULT]", config };
}

export function getApp() {
  return { name: "[DEFAULT]" };
}
