import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleHealthRequest } from '../health';
import type { ApiRequest, ApiResponse } from '../types';

describe('API Endpoints', () => {
  let mockRequest: ApiRequest;
  let mockResponse: ApiResponse;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create mock response
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy }) as any;
    
    mockResponse = {
      status: statusSpy as any,
      json: jsonSpy,
      send: vi.fn(),
      setHeader: vi.fn(),
    };
    
    mockRequest = {
      method: 'GET',
      query: {},
      body: {},
      headers: {},
    };
  });

  describe('Health Endpoint', () => {
    it('should return health status', async () => {
      await handleHealthRequest(mockRequest, mockResponse, null);
      
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'ok',
        timestamp: expect.any(String),
        method: 'GET',
        hasAuth: false,
        environment: expect.any(String),
      });
    });
  });
});