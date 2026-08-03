const API_BASE: string = import.meta.env.VITE_API_BASE || '';

interface ConfigResponse {
  integrations: {
    serviceNowConfigured: boolean;
  };
}

interface ServiceNowStory {
  sysId: string;
  number: string;
  shortDescription: string;
  description: string;
  state: string;
  priority: string;
  acceptanceCriteria: string;
  epic: { sysId: string; number: string; title: string } | null;
  source: 'servicenow';
}

interface StoriesResponse {
  success: boolean;
  stories?: ServiceNowStory[];
  error?: string;
}

/**
 * Calls GET /api/config to determine which integrations the backend has configured.
 */
export async function fetchServiceNowConfig(): Promise<ConfigResponse> {
  const response = await fetch(`${API_BASE}/api/config`);
  if (!response.ok) {
    throw new Error(`Failed to load config: HTTP ${response.status}`);
  }
  return response.json() as Promise<ConfigResponse>;
}

/**
 * Calls GET /api/servicenow/stories.
 * Returns normalized stories ({ sysId, number, shortDescription, ... })
 */
export async function fetchServiceNowStories(): Promise<ServiceNowStory[]> {
  const response = await fetch(`${API_BASE}/api/servicenow/stories`);
  const data = await response.json() as StoriesResponse;
  if (!response.ok || !data.success) {
    throw new Error(data.error || `Failed to fetch ServiceNow stories: HTTP ${response.status}`);
  }
  return data.stories ?? [];
}
