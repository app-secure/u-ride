/**
 * Wrapper genérico para respuestas paginadas de la API.
 * Coincide con PagedResultDto<T> del backend .NET.
 */
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
