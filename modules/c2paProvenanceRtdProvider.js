import { submodule } from '../src/hook.js';
import { ajax } from '../src/ajax.js';
import { logError, logInfo, deepSetValue } from '../src/utils.js';

const REAL_TIME_MODULE = 'realTimeData';
export const C2PA_MODULE_NAME = 'c2paProvenance';
const LOG_PREFIX = '[C2PA Provenance RTD]: ';

/**
 * Read the C2PA manifest URL from the page meta tag or module config.
 * @param {Object} moduleConfig
 * @returns {string|null}
 */
function getManifestUrl(moduleConfig) {
  const metaTag = document.querySelector('meta[name="c2pa-manifest-url"]');
  if (metaTag && metaTag.content) {
    return metaTag.content;
  }
  const configUrl = moduleConfig && moduleConfig.params && moduleConfig.params.manifestUrl;
  return configUrl || null;
}

/**
 * Parse the manifest response and build the ortb2 payload.
 * @param {Object} manifest
 * @param {string} manifestUrl
 * @returns {Object}
 */
function buildPayload(manifest, manifestUrl) {
  return {
    manifest_url: manifestUrl,
    verified: manifest.status === 'ok',
    signer_tier: manifest.signerTier || 'local',
    action: (manifest.actions && manifest.actions[0] && manifest.actions[0].action) || undefined,
    signed_at: manifest.signedAt || undefined
  };
}

/**
 * @param {Object} config
 * @returns {boolean}
 */
const init = (config) => {
  return true;
};

/**
 * @param {Object} reqBidsConfigObj
 * @param {Function} callback
 * @param {Object} moduleConfig
 */
const getBidRequestData = (reqBidsConfigObj, callback, moduleConfig) => {
  const manifestUrl = getManifestUrl(moduleConfig);
  if (!manifestUrl) {
    logInfo(LOG_PREFIX, 'No C2PA manifest URL found');
    callback();
    return;
  }

  const callbacks = {
    success(responseText) {
      try {
        const manifest = JSON.parse(responseText);
        const payload = buildPayload(manifest, manifestUrl);
        deepSetValue(reqBidsConfigObj.ortb2Fragments.global, 'site.ext.data.c2pa', payload);
        logInfo(LOG_PREFIX, 'Provenance data injected');
      } catch (e) {
        logError(LOG_PREFIX, 'Failed to parse manifest', e);
      }
      callback();
    },
    error(error) {
      logError(LOG_PREFIX, 'Manifest fetch failed', error);
      callback();
    }
  };

  ajax(manifestUrl, callbacks, null, {
    method: 'GET',
    customHeaders: { 'Accept': 'application/json' }
  });
};

export const c2paProvenanceSubmodule = {
  name: C2PA_MODULE_NAME,
  init,
  getBidRequestData
};

submodule(REAL_TIME_MODULE, c2paProvenanceSubmodule);
