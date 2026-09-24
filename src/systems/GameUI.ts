import type { Upgrade } from './Progression';

/** Native controls preserve keyboard access and stay usable while simulation is paused. */
export class GameUI {
  private root = document.createElement('div');
  private toolbar = document.createElement('div');
  private overlay = document.createElement('div');
  private targetButton: HTMLButtonElement;
  private returnFocus: HTMLElement | null = null;
  constructor(private actions: { pause: () => void; target: () => void; restart: () => void }) {
    this.root.id = 'interface';
    this.toolbar.className = 'toolbar';
    this.targetButton = this.button('', actions.target);
    this.toolbar.append(this.targetButton, this.button('Pause [Esc]', actions.pause));
    this.overlay.className = 'overlay';
    this.overlay.hidden = true;
    this.overlay.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const buttons = Array.from(this.overlay.querySelectorAll('button'));
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    this.root.append(this.toolbar, this.overlay);
    document.querySelector('#game')!.append(this.root);
  }
  setTarget(mode: string): void {
    this.targetButton.textContent = `Target: ${mode} [T]`;
    const pauseTarget = this.overlay.querySelector('[data-target]');
    if (pauseTarget) pauseTarget.textContent = `Target: ${mode} [T]`;
  }
  showPause(summary: string, mode: string): void {
    const panel = this.panel('Paused', summary);
    const resume = this.button('Resume [Esc]', this.actions.pause);
    const target = this.button(`Target: ${mode} [T]`, this.actions.target);
    target.dataset.target = '';
    panel.append(resume, target, this.button('Restart run', this.actions.restart));
    resume.focus();
  }
  showChoices(level: number, choices: Upgrade[], choose: (index: number) => void): void {
    const panel = this.panel(`Level ${level}`, 'Choose one upgrade. The run is paused.');
    panel.classList.add('upgrade-panel');
    const cards = document.createElement('div'); cards.className = 'cards';
    choices.forEach((upgrade, index) => {
      const button = this.button('', () => choose(index)); button.className = 'upgrade-card';
      const key = document.createElement('span'); key.className = 'card-key'; key.textContent = `0${index + 1}`;
      const title = document.createElement('strong'); title.textContent = upgrade.title;
      const description = document.createElement('span'); description.textContent = upgrade.description;
      button.append(key, title, description); cards.append(button);
    });
    panel.append(cards); (cards.firstElementChild as HTMLElement)?.focus();
  }
  showEnd(summary: string): void {
    const panel = this.panel('Run ended', summary);
    const retry = this.button('New run [R]', this.actions.restart); panel.append(retry); retry.focus();
  }
  hide(): void {
    this.overlay.hidden = true; this.overlay.replaceChildren(); this.toolbar.inert = false;
    if (this.returnFocus?.isConnected) this.returnFocus.focus();
    else this.targetButton.blur();
  }
  destroy(): void { this.root.remove(); }
  private panel(title: string, summary: string): HTMLDivElement {
    if (this.overlay.hidden) this.returnFocus = document.activeElement as HTMLElement;
    this.overlay.replaceChildren(); this.overlay.hidden = false; this.toolbar.inert = true;
    const panel = document.createElement('div'); panel.className = 'panel';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'panel-title');
    const heading = document.createElement('h1'); heading.id = 'panel-title'; heading.textContent = title;
    const details = document.createElement('p'); details.textContent = summary;
    panel.append(heading, details); this.overlay.append(panel); return panel;
  }
  private button(text: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
    button.addEventListener('click', action); return button;
  }
}
