import apiClient from './clients';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function getPaginatedResults<T>(
  url: string,
  params?: Record<string, string | number>,
): Promise<T[]> {
  const results: T[] = [];
  let nextUrl: string | null = url;
  let nextParams = params;

  while (nextUrl) {
    const response: { data: PaginatedResponse<T> } = await apiClient.get<PaginatedResponse<T>>(nextUrl, {
      params: nextParams,
    });
    const data = response.data;
    results.push(...data.results);
    nextUrl = data.next;
    nextParams = undefined;
  }

  return results;
}
