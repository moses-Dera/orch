import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessageSchema, JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { SSEStreamingApi } from 'hono/streaming';

export class HonoSSEServerTransport implements Transport {
  private _endpoint: string;
  private _stream: SSEStreamingApi | undefined;
  private _sessionId: string;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(endpoint: string, stream: SSEStreamingApi, sessionId: string) {
    this._endpoint = endpoint;
    this._stream = stream;
    this._sessionId = sessionId;
  }

  async start(): Promise<void> {
    if (!this._stream) {
      throw new Error("Stream is not initialized");
    }
    
    const dummyBase = "http://localhost";
    const endpointUrl = new URL(this._endpoint, dummyBase);
    endpointUrl.searchParams.set("sessionId", this._sessionId);
    const relativeUrlWithSession = endpointUrl.pathname + endpointUrl.search + endpointUrl.hash;
    
    await this._stream.writeSSE({
      event: 'endpoint',
      data: relativeUrlWithSession,
    });
  }

  async handlePostMessage(body: any): Promise<void> {
    try {
      const parsedMessage = JSONRPCMessageSchema.parse(body);
      this.onmessage?.(parsedMessage);
    } catch (error) {
      this.onerror?.(error as Error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this._stream) {
      await this._stream.close();
      this._stream = undefined;
      this.onclose?.();
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this._stream) {
      throw new Error("Not connected");
    }
    await this._stream.writeSSE({
      event: 'message',
      data: JSON.stringify(message),
    });
  }
}
