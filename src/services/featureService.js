import apiService from './apiService';

/**
 * Which optional features this server actually has.
 *
 * Distinct from roles: roles say whether this user may open a screen, this says whether the
 * screen exists on this deployment at all. Some capabilities depend on a companion service the
 * operator may not run — reading that from the server is the only way the UI can know, since it
 * is a property of the installation, not of the token.
 */
export const getFeatures = () => apiService.get('/features');

const featureService = { getFeatures };

export default featureService;
