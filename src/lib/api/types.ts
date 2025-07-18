/**
 * Common types for API handlers
 */

// Express-like interfaces for our API
export interface ApiRequest {
  method: string;
  query: Record<string, any>;
  body: any;
  headers: Record<string, string>;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  json(data: any): void;
  send(data?: any): void;
  setHeader(name: string, value: string): void;
}

export interface AuthenticatedRequest extends ApiRequest {
  userId?: string;
}