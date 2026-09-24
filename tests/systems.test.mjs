import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { Progression, UPGRADES } = await load('../src/systems/Progression.ts');
const { selectTarget } = await load('../src/systems/targeting.ts');
const p = new Progression();
p.gain(4); assert.equal(p.advance(), false);
p.gain(11); assert.equal(p.advance(), true); assert.equal(p.level, 2); assert.equal(p.xp, 10);
assert.equal(p.advance(), true); assert.equal(p.level, 3); assert.equal(p.xp, 2);
assert.equal(p.advance(), false); assert.equal(p.totalXp, 15);
const stats = { damage: 1, cooldown: 0.42, speed: 235, pickupRadius: 28, maxHp: 5, hp: 5 };
for (const random of [() => 0, () => 0.5, () => 0.9999]) {
  const choices = p.choices(stats, random);
  assert.equal(choices.length, 3); assert.equal(new Set(choices.map(c => c.id)).size, 3);
  assert.ok(choices.every(c => c.id !== 'repair'));
}
stats.hp = 4; UPGRADES.find(c => c.id === 'repair').apply(stats); assert.equal(stats.hp, 5);
UPGRADES.find(c => c.id === 'hp').apply(stats); assert.equal(stats.maxHp, 6); assert.equal(stats.hp, 6);
const enemy = (x, hp) => ({ sprite: { x, y: 0 }, hp });
const near = enemy(10, 2), weak = enemy(50, 1), strong = enemy(70, 5), outside = enemy(500, 100);
const enemies = [outside, strong, weak, near];
assert.equal(selectTarget(enemies, 0, 0, 100, 'Nearest'), near);
assert.equal(selectTarget(enemies, 0, 0, 100, 'Weakest'), weak);
assert.equal(selectTarget(enemies, 0, 0, 100, 'Strongest'), strong);
assert.equal(selectTarget([enemy(50, 2), near], 0, 0, 100, 'Strongest'), near);
assert.equal(selectTarget([outside], 0, 0, 100, 'Nearest'), undefined);
console.log('Passed: XP overflow, repeated levels, unique eligible choices, healing limits, all targeting modes and range.');
