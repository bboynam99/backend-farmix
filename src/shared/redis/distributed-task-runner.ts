import { Logger } from '@nestjs/common';
import IORedis from 'ioredis';
import Redlock, { ResourceLockedError } from 'redlock';

export class DistributedTaskRunner {
  private readonly runnerName: string;
  private readonly logger: Logger;
  private readonly redis: IORedis;
  private readonly redlock: Redlock;

  private shuttingDown: boolean = false;
  private runningTasksPromiseMap: Map<string, Promise<void>> = new Map();
  private runningTasksAbortControllersMap: Map<string, AbortController> = new Map();

  constructor(
    name: string,
    redis: IORedis,
  ) {
    this.runnerName = name;
    this.logger = new Logger(`${DistributedTaskRunner.name}:${name}`);
    this.redis = redis;
    this.redlock = new Redlock([this.redis], { retryCount: 0 });
  }

  async stop() {
    this.logger.debug(`[${this.runnerName}]: start shutting down`);

    this.shuttingDown = true;
    this.runningTasksAbortControllersMap.forEach((controller) => {
      controller.abort('shutting down');
    });
    await Promise.all([...this.runningTasksPromiseMap.values()]);

    this.runningTasksPromiseMap = new Map();
    this.runningTasksAbortControllersMap = new Map();

    this.logger.debug(`[${this.runnerName}]: shutdown complete`);
  }

  async runOnce(
    key: string,
    taskCb: (signal: AbortSignal) => Promise<void>,
    options: { shouldRun?: (redis: IORedis) => Promise<boolean>, maxDuration?: number, retryCount?: number },
  ) {
    const shouldRun = options.shouldRun ?? (() => true);
    const maxDuration = options.maxDuration ?? 300_000;
    const retryCount = options.retryCount ?? 0;
    const fullKey = `${this.runnerName}:${key}`;

    await this.redlock.using([fullKey], maxDuration, { retryCount }, async (signal) => {
      if (this.shuttingDown) {
        this.logger.debug(`[${this.runnerName}]: runner is shutting down, skip task (${fullKey})`);

        return;
      }

      if (!await shouldRun(this.redis)) {
        this.logger.verbose(`[${this.runnerName}]: task was done recently, skip task (${fullKey})`);

        return;
      }

      const abortController = new AbortController();
      signal.onabort = () => {
        abortController!.abort(signal.reason);
      };
      const taskPromise = taskCb(abortController.signal).finally(() => {
        this.runningTasksPromiseMap.delete(fullKey);
        this.runningTasksAbortControllersMap.delete(fullKey);
      });
      this.runningTasksAbortControllersMap.set(fullKey, abortController);
      this.runningTasksPromiseMap.set(fullKey, taskPromise);

      await taskPromise;
    });
  }

  isLockedByAnotherServiceErr(err: any): boolean {
    return (
      err instanceof ResourceLockedError ||
      err?.message === 'The operation was unable to achieve a quorum during its retry window.'
    );
  }
}
