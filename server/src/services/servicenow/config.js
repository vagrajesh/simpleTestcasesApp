/**
 * Reads the shared ServiceNow service-account configuration from env vars.
 * There is no per-user connection — a single credential set (configured by
 * whoever runs the backend) is used for every request, mirroring the
 * existing GROQ_API_KEY pattern in services/llm/providers/groq.js.
 */
export function getServiceNowConfig() {
  return {
    instanceUrl: process.env.SERVICENOW_INSTANCE_URL,
    clientId: process.env.SERVICENOW_CLIENT_ID,
    clientSecret: process.env.SERVICENOW_CLIENT_SECRET,
  };
}

export function isServiceNowConfigured() {
  const { instanceUrl, clientId, clientSecret } = getServiceNowConfig();
  return Boolean(instanceUrl && clientId && clientSecret);
}
