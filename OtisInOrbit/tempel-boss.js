import { V3 } from './core.js?v=sub1';

// No boss in the temple: it was abandoned long ago. The game still expects one, so here's a boss that never wakes.
export const boss = { state: 'sleep', t: 0, hits: 0 };
export const BOSS_INFO = {
  name: '', sub: '', winTitle: '', winSub: '', fail: 'Au! Terug naar je laatste checkpoint',
  cookie: '', cookieY: 0, cookieAt: V3(),
};
export function resetBoss() { boss.state = 'sleep'; }
export const bossActive = () => false;
export function setBossDead() { boss.state = 'sleep'; }
export function updateBoss() {}
