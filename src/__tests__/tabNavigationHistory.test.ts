import {
  canTabNavigateBack,
  canTabNavigateForward,
  createTabNavigationStacks,
  pushTabNavigationBack,
  tabNavigationGoBack,
  tabNavigationGoForward,
} from '../renderer/lib/tabNavigationHistory';

describe('tabNavigationHistory', () => {
  it('pushes back and clears forward', () => {
    let stacks = createTabNavigationStacks();
    stacks = pushTabNavigationBack(stacks, 'a.md');
    stacks = { ...stacks, forward: ['b.md'] };
    stacks = pushTabNavigationBack(stacks, 'c.md');
    expect(stacks.back).toEqual(['a.md', 'c.md']);
    expect(stacks.forward).toEqual([]);
  });

  it('goes back and forward symmetrically', () => {
    let stacks = pushTabNavigationBack(
      pushTabNavigationBack(createTabNavigationStacks(), 'a.md'),
      'b.md',
    );
    const back1 = tabNavigationGoBack(stacks, 'c.md');
    expect(back1.target).toBe('b.md');
    expect(back1.stacks.back).toEqual(['a.md']);
    expect(back1.stacks.forward).toEqual(['c.md']);

    const fwd1 = tabNavigationGoForward(back1.stacks, 'b.md');
    expect(fwd1.target).toBe('c.md');
    expect(fwd1.stacks.back).toEqual(['a.md', 'b.md']);
    expect(fwd1.stacks.forward).toEqual([]);
  });

  it('reports can navigate flags', () => {
    const empty = createTabNavigationStacks();
    expect(canTabNavigateBack(empty)).toBe(false);
    expect(canTabNavigateForward(empty)).toBe(false);
    const withBack = pushTabNavigationBack(empty, 'x.md');
    expect(canTabNavigateBack(withBack)).toBe(true);
    const { stacks } = tabNavigationGoBack(withBack, 'y.md');
    expect(canTabNavigateForward(stacks)).toBe(true);
  });
});
