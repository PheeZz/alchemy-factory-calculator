import { useViewStore } from './view';

test('switching view writes ?view= and never touches the share hash', () => {
  history.replaceState(null, '', '/app/?x=1#s=abc');
  useViewStore.getState().setView('fuel');
  expect(location.search).toBe('?x=1&view=fuel');
  expect(location.hash).toBe('#s=abc');
  useViewStore.getState().setView('calculator');
  expect(location.search).toBe('?x=1');
  expect(location.hash).toBe('#s=abc');
});
