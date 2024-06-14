import {
  createServer,
  RequestListener,
  Server,
} from 'http';

export class PromisifiedHttpServer {
  readonly server: Server;

  constructor(handler: RequestListener) {
    this.server = createServer(handler);
  }

  async listen(port: number): Promise<void> {
    return new Promise((res, rej) => {
      this.server.listen(port)
        .once('listening', res)
        .once('error', rej);
    });
  }

  async close(): Promise<void> {
    return new Promise((res, rej) => {
      this.server.close((err?: Error) => {
        if (err) return rej(err);

        return res();
      });
    });
  }
}
