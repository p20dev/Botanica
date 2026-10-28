import type { CollectionStats } from "@botanica/shared";
import type {
  CatalogResponse,
  PlantDto,
  PageDto,
  BreedingResponse,
  BreedingEventDto,
  CreatePlantRequest,
  BreedingRequest,
} from "@botanica/shared";
export class RequestError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}
let csrfToken = "";
export function setCsrf(token: string) {
  csrfToken = token;
}
export async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api/v1" + url, {
      ...options,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
        ...options.headers,
      },
    });
  } catch {
    throw new RequestError(
      "Cannot reach the laboratory. Check your connection and retry.",
      "NETWORK_ERROR",
      0,
    );
  }
  const body = await response.json();
  if (!response.ok)
    throw new RequestError(
      body.error?.message ?? "The request failed.",
      body.error?.code ?? "REQUEST_ERROR",
      response.status,
    );
  return body as T;
}
export const api = {
  stats: () => request<CollectionStats>("/collection/stats"),
  birth: (id: string) =>
    request<{ event: BreedingEventDto | null }>(
      "/plants/" + encodeURIComponent(id) + "/birth",
    ),
  catalog: () => request<CatalogResponse>("/catalog/species"),
  plant: (id: string) => request<PlantDto>("/plants/" + encodeURIComponent(id)),
  plants: (query = "") =>
    request<PageDto<PlantDto>>("/plants" + (query ? "?" + query : "")),
  create: (input: CreatePlantRequest) =>
    request<PlantDto>("/plants", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  cross: (input: BreedingRequest) =>
    request<BreedingResponse>("/breeding", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  events: (cursor?: string) =>
    request<PageDto<BreedingEventDto>>(
      "/breeding?limit=12" +
        (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
    ),
};
export const plantQuery = (id: string) => ({
  queryKey: ["plant", id],
  queryFn: () => api.plant(id),
});
export async function loadAllParents() {
  const items: PlantDto[] = [];
  let cursor: string | null = null;
  do {
    const page = await api.plants(
      new URLSearchParams({
        limit: "100",
        ...(cursor ? { cursor } : {}),
      }).toString(),
    );
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor && items.length < 1000);
  return items.filter((p) => p.gameEligible && !p.soldAt);
}
