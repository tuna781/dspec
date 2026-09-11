// ============================================================
// Step tracker — install progress, zero-dep
//
// Like spec-kit's `StepTracker`: a list of steps redrawn in place when there is a TTY, and
// **printed as flat lines when there is not**. The second branch is the one that matters: CI
// logs turn ANSI escapes into unreadable noise, and `npx dspec init` inside a pipeline is an
// ordinary use, not an edge case.
// ============================================================

export type StepState = 'pending' | 'running' | 'done' | 'skip' | 'error';

interface Step {
  key: string;
  label: string;
  state: StepState;
  detail?: string;
  /** Already printed in non-TTY mode — so each step occupies exactly one log line. */
  logged?: boolean;
}

const MARK: Record<StepState, string> = {
  pending: '○',
  running: '◐',
  done: '✓',
  skip: '–',
  error: '✗',
};

const UP = (n: number) => `\u001b[${n}A`;
const CLEAR_BELOW = '\u001b[0J';

export class Tracker {
  private steps: Step[] = [];
  private drawn = 0;
  private readonly tty: boolean;

  constructor(private readonly out: NodeJS.WriteStream = process.stdout) {
    this.tty = Boolean(out.isTTY);
  }

  add(key: string, label: string): void {
    this.steps.push({ key, label, state: 'pending' });
    this.render();
  }

  set(key: string, state: StepState, detail?: string): void {
    const s = this.steps.find((x) => x.key === key);
    if (!s) return;
    s.state = state;
    if (detail !== undefined) s.detail = detail;
    this.render();
  }

  start(key: string): void {
    this.set(key, 'running');
  }
  done(key: string, detail?: string): void {
    this.set(key, 'done', detail);
  }
  skip(key: string, detail?: string): void {
    this.set(key, 'skip', detail);
  }
  error(key: string, detail?: string): void {
    this.set(key, 'error', detail);
  }

  private line(s: Step): string {
    return `  ${MARK[s.state]} ${s.label}${s.detail ? ` — ${s.detail}` : ''}`;
  }

  private render(): void {
    if (!this.tty) {
      // No TTY ⇒ print only FINISHED steps, each exactly once. `running` prints nothing: it
      // is an intermediate state, and printing it gives the log two lines for one job.
      for (const s of this.steps) {
        if (s.state === 'pending' || s.state === 'running' || s.logged) continue;
        s.logged = true;
        this.out.write(this.line(s) + '\n');
      }
      return;
    }
    if (this.drawn) this.out.write(UP(this.drawn) + CLEAR_BELOW);
    this.out.write(this.steps.map((s) => this.line(s)).join('\n') + '\n');
    this.drawn = this.steps.length;
  }

  /** Release the cursor from the drawing area so later output is not overwritten. */
  finish(): void {
    this.drawn = 0;
    if (this.tty) this.out.write('\n');
  }
}
