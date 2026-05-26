import apiClient from './clients';

// Django REST Framework with pagination doesn't return all results in one response.
// This utility gives you one flat array of all pages.
// This works for this project because the database is small. For production we would keep the pagination in the UI.

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function getPaginatedResults<T>(
  url: string,
  params?: Record<string, string | number>, // Optional query parameters (like ?project=5 or ?status=Active).
): Promise<T[]> { //  A flat array of all items across all pages.
  const results: T[] = [];
  let nextUrl: string | null = url;
  let nextParams = params;

  while (nextUrl) {
    const response: { data: PaginatedResponse<T> } = await apiClient.get<PaginatedResponse<T>>(nextUrl, {
      params: nextParams,
    });
    const data = response.data;
    results.push(...data.results); // accumulate results.
    nextUrl = data.next; // loop until nextUrl is null.
    nextParams = undefined; // next URL from Django already contains the query string, so we undefine it to avoid duplication.
  }

  return results;
}
