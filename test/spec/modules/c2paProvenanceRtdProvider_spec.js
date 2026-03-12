import assert from 'assert';
import {
  c2paProvenanceSubmodule,
  C2PA_MODULE_NAME
} from 'modules/c2paProvenanceRtdProvider';
import { server } from 'test/mocks/xhr.js';

describe('c2paProvenanceRtdProvider', () => {
  const fakeResponseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  const fakeManifest = {
    status: 'ok',
    signerTier: 'local',
    actions: [{ action: 'c2pa.created' }],
    signedAt: '2026-03-12T00:00:00Z'
  };

  const manifestUrl = 'https://publisher.com/wp-json/c2pa-provenance/v1/images/manifest/42';

  function makeReqBidsConfigObj() {
    return {
      ortb2Fragments: {
        global: {}
      }
    };
  }

  let metaTag;

  beforeEach(() => {
    // Add a meta tag to the document
    metaTag = document.createElement('meta');
    metaTag.name = 'c2pa-manifest-url';
    metaTag.content = manifestUrl;
    document.head.appendChild(metaTag);
  });

  afterEach(() => {
    if (metaTag && metaTag.parentNode) {
      metaTag.parentNode.removeChild(metaTag);
    }
  });

  describe('init', () => {
    it('returns true', () => {
      const result = c2paProvenanceSubmodule.init({});
      assert.strictEqual(result, true);
    });
  });

  describe('module name', () => {
    it('has the correct module name', () => {
      assert.strictEqual(c2paProvenanceSubmodule.name, 'c2paProvenance');
      assert.strictEqual(C2PA_MODULE_NAME, 'c2paProvenance');
    });
  });

  describe('getBidRequestData', () => {
    it('fetches manifest from meta tag and injects ortb2 data', (done) => {
      const reqBidsConfigObj = makeReqBidsConfigObj();
      const moduleConfig = { params: {} };

      c2paProvenanceSubmodule.getBidRequestData(reqBidsConfigObj, () => {
        const c2pa = reqBidsConfigObj.ortb2Fragments.global.site.ext.data.c2pa;
        assert.deepStrictEqual(c2pa, {
          manifest_url: manifestUrl,
          verified: true,
          signer_tier: 'local',
          action: 'c2pa.created',
          signed_at: '2026-03-12T00:00:00Z'
        });
        done();
      }, moduleConfig);

      server.requests[server.requests.length - 1].respond(
        200, fakeResponseHeaders, JSON.stringify(fakeManifest)
      );
    });

    it('uses params.manifestUrl when meta tag is absent', (done) => {
      // Remove the meta tag
      metaTag.parentNode.removeChild(metaTag);

      const configUrl = 'https://example.com/wp-json/c2pa-provenance/v1/images/manifest/99';
      const reqBidsConfigObj = makeReqBidsConfigObj();
      const moduleConfig = { params: { manifestUrl: configUrl } };

      c2paProvenanceSubmodule.getBidRequestData(reqBidsConfigObj, () => {
        const c2pa = reqBidsConfigObj.ortb2Fragments.global.site.ext.data.c2pa;
        assert.strictEqual(c2pa.manifest_url, configUrl);
        assert.strictEqual(c2pa.verified, true);
        done();
      }, moduleConfig);

      server.requests[server.requests.length - 1].respond(
        200, fakeResponseHeaders, JSON.stringify(fakeManifest)
      );
    });

    it('calls callback without setting ortb2 when no manifest URL is found', (done) => {
      // Remove the meta tag
      metaTag.parentNode.removeChild(metaTag);

      const reqBidsConfigObj = makeReqBidsConfigObj();
      const moduleConfig = { params: {} };

      c2paProvenanceSubmodule.getBidRequestData(reqBidsConfigObj, () => {
        assert.strictEqual(reqBidsConfigObj.ortb2Fragments.global.site, undefined);
        done();
      }, moduleConfig);
    });

    it('calls callback without throwing on fetch error', (done) => {
      const reqBidsConfigObj = makeReqBidsConfigObj();
      const moduleConfig = { params: {} };

      c2paProvenanceSubmodule.getBidRequestData(reqBidsConfigObj, () => {
        // ortb2 should not have c2pa data on error
        assert.strictEqual(reqBidsConfigObj.ortb2Fragments.global.site, undefined);
        done();
      }, moduleConfig);

      server.requests[server.requests.length - 1].respond(
        500, fakeResponseHeaders, 'Internal Server Error'
      );
    });

    it('sets verified to false when manifest status is not ok', (done) => {
      const badManifest = { ...fakeManifest, status: 'error' };
      const reqBidsConfigObj = makeReqBidsConfigObj();
      const moduleConfig = { params: {} };

      c2paProvenanceSubmodule.getBidRequestData(reqBidsConfigObj, () => {
        const c2pa = reqBidsConfigObj.ortb2Fragments.global.site.ext.data.c2pa;
        assert.strictEqual(c2pa.verified, false);
        done();
      }, moduleConfig);

      server.requests[server.requests.length - 1].respond(
        200, fakeResponseHeaders, JSON.stringify(badManifest)
      );
    });

    it('injects correct shape with all expected fields', (done) => {
      const reqBidsConfigObj = makeReqBidsConfigObj();
      const moduleConfig = { params: {} };

      c2paProvenanceSubmodule.getBidRequestData(reqBidsConfigObj, () => {
        const c2pa = reqBidsConfigObj.ortb2Fragments.global.site.ext.data.c2pa;
        const expectedKeys = ['manifest_url', 'verified', 'signer_tier', 'action', 'signed_at'];
        assert.deepStrictEqual(Object.keys(c2pa).sort(), expectedKeys.sort());
        done();
      }, moduleConfig);

      server.requests[server.requests.length - 1].respond(
        200, fakeResponseHeaders, JSON.stringify(fakeManifest)
      );
    });

    it('handles different signer tiers correctly', (done) => {
      const byokManifest = { ...fakeManifest, signerTier: 'byok' };
      const reqBidsConfigObj = makeReqBidsConfigObj();
      const moduleConfig = { params: {} };

      c2paProvenanceSubmodule.getBidRequestData(reqBidsConfigObj, () => {
        const c2pa = reqBidsConfigObj.ortb2Fragments.global.site.ext.data.c2pa;
        assert.strictEqual(c2pa.signer_tier, 'byok');
        done();
      }, moduleConfig);

      server.requests[server.requests.length - 1].respond(
        200, fakeResponseHeaders, JSON.stringify(byokManifest)
      );
    });
  });
});
