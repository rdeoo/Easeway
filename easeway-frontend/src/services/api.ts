type ApiOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  accessToken?: string;
  signal?: AbortSignal;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly details: unknown,
  ) {
    super(
      typeof details === 'string'
        ? details
        : `API request failed (${status}).`,
    );
    this.name = 'ApiError';
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  {
    method = 'GET',
    body,
    accessToken,
    signal,
  }: ApiOptions = {},
): Promise<T | undefined> {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!baseUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured.');
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`,
    {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    let details: unknown = text || response.statusText;

    // FastAPI errors usually contain a JSON "detail" field.
    if (response.headers.get('content-type')?.includes('application/json') && text) {
      const error: unknown = JSON.parse(text);
      details =
        typeof error === 'object' && error !== null && 'detail' in error
          ? error.detail
          : error;
    }

    throw new ApiError(response.status, details);
  }

  // DELETE endpoints commonly return 204 with no response body.
  if (response.status === 204) {
    return undefined;
  }

  return response.json();
}