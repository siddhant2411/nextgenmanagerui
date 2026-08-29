import apiService from './apiService';

/**
 * AI Lead Review reads and writes.
 *
 * These go through the NGM backend like every other module — apiService, same origin, same
 * token, same refresh-on-401 handling. The backend proxies each call to the Python agent
 * server-to-server (see AiLeadAgentController in the main repo); the browser never talks to the
 * agent directly, and there is nothing agent-specific to configure here.
 */

/**
 * Dependency status for the CRM banner. Cheap to call: it reports database, Ollama and mail-
 * ingestion health without touching any lead data.
 */
export const getAgentHealth = () => apiService.get('/ai-lead-agent/health');

/** Queue counters for the dashboard tiles. */
export const getAgentStats = () => apiService.get('/ai-lead-agent/stats');

/** Review queue page. status is PENDING, APPROVED, REJECTED, EDITED or MERGED. */
export const getReviewQueue = ({ status = 'PENDING', page = 0, size = 50 } = {}) =>
    apiService.get('/ai-lead-agent/queue', { status, page, size });

/**
 * Adjudicate one task.
 *
 * The reviewer's identity is deliberately absent from this payload — the backend relays the
 * caller's own verified token to the agent, which takes the identity from that. A reviewer name
 * the client could set would be a field, not an audit trail.
 */
export const submitReviewAction = (taskId, { action, notes = '', editData = null, targetEnquiryId = null }) =>
    apiService.post(`/ai-lead-agent/queue/${taskId}/action`, {
        action,
        notes,
        edit_data: editData || undefined,
        target_enquiry_id: targetEnquiryId || undefined,
    });

/** Full per-agent trace for one email: what each step decided, how long it took, and why. */
export const getRunTrace = (emailId) => apiService.get(`/ai-lead-agent/runs/${emailId}`);

/**
 * Trigger an ingestion cycle now instead of waiting for the interval.
 *
 * Matches the 5-minute read timeout the backend proxy uses for this same call
 * (AiLeadAgentClientConfig on the Java side) -- a poll cycle runs classification and extraction
 * against a local model for every new message, which is genuinely slow on CPU. The two were
 * previously out of sync at 60s here with no explicit timeout at all on the Java side, so a real
 * cycle would time out mid-flight while the agent kept working: the CRM reported "AI Lead Agent
 * is not running" for a request that was quietly succeeding, confirmed by the queue reflecting
 * the results moments later on a manual refresh.
 */
export const triggerPoll = () => apiService.post('/ai-lead-agent/poll', {}, { timeout: 300000 });

const aiLeadAgentService = {
    getAgentHealth,
    getAgentStats,
    getReviewQueue,
    submitReviewAction,
    getRunTrace,
    triggerPoll,
};

export default aiLeadAgentService;
