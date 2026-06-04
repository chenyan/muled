export interface TabNavigationStacks {
  back: string[];
  forward: string[];
}

export function createTabNavigationStacks(): TabNavigationStacks {
  return { back: [], forward: [] };
}

export function pushTabNavigationBack(
  stacks: TabNavigationStacks,
  currentPath: string,
): TabNavigationStacks {
  return {
    back: [...stacks.back, currentPath],
    forward: [],
  };
}

export function tabNavigationGoBack(
  stacks: TabNavigationStacks,
  currentPath: string | null,
): { stacks: TabNavigationStacks; target: string | null } {
  if (stacks.back.length === 0) {
    return { stacks, target: null };
  }
  const back = [...stacks.back];
  const target = back.pop()!;
  const forward =
    currentPath != null ? [...stacks.forward, currentPath] : stacks.forward;
  return { stacks: { back, forward }, target };
}

export function tabNavigationGoForward(
  stacks: TabNavigationStacks,
  currentPath: string | null,
): { stacks: TabNavigationStacks; target: string | null } {
  if (stacks.forward.length === 0) {
    return { stacks, target: null };
  }
  const forward = [...stacks.forward];
  const target = forward.pop()!;
  const back =
    currentPath != null ? [...stacks.back, currentPath] : stacks.back;
  return { stacks: { back, forward }, target };
}

export function canTabNavigateBack(stacks: TabNavigationStacks): boolean {
  return stacks.back.length > 0;
}

export function canTabNavigateForward(stacks: TabNavigationStacks): boolean {
  return stacks.forward.length > 0;
}
