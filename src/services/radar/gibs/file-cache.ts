import fs from 'fs/promises';
import path from 'path';

// Files are written to a temp name and renamed, so a reader never sees a half-written image.
export class FileCache {
  // two callers asking for the same file at once share one computation
  private pending = new Map<string, Promise<string>>();

  constructor(
    private dir: string,
    private now: () => number,
  ) {}

  ensure(relativePath: string, produce: () => Promise<Buffer>): Promise<string> {
    const file = path.join(this.dir, relativePath);
    let running = this.pending.get(file);
    if (!running) {
      running = this.write(file, produce).finally(() => this.pending.delete(file));
      this.pending.set(file, running);
    }
    return running;
  }

  private async write(file: string, produce: () => Promise<Buffer>): Promise<string> {
    try {
      await fs.access(file);
      return file;
    } catch {
      // not cached yet
    }
    const data = await produce();
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.${this.now()}.tmp`;
    await fs.writeFile(tmp, data);
    await fs.rename(tmp, file);
    return file;
  }

  // Frames are named `<circles>_<epoch ms>.png`; drops the ones older than the retention.
  async pruneOlderThan(subdir: string, retentionMs: number): Promise<void> {
    try {
      const dir = path.join(this.dir, subdir);
      const cutoff = this.now() - retentionMs;
      for (const name of await fs.readdir(dir)) {
        const time = Number(name.replace('.png', '').split('_').pop());
        if (Number.isFinite(time) && time < cutoff) await fs.unlink(path.join(dir, name));
      }
    } catch {
      // best effort
    }
  }
}
