# Overview

Module Name: C2PA Provenance Rtd Provider
Module Type: Rtd Provider
Maintainer: engineering@developer.example

# Description

This module reads C2PA (Coalition for Content Provenance and Authenticity) image provenance data from a WordPress site and injects it into the OpenRTB2 bid stream at `site.ext.data.c2pa`.

The provenance manifest URL is discovered from a `<meta name="c2pa-manifest-url">` tag rendered by the WordPress AI Image Provenance plugin. If the meta tag is not present, an optional `params.manifestUrl` override can be supplied in the module configuration.

No external JavaScript is loaded. The module fetches the manifest JSON from the local WordPress REST API endpoint and extracts verification status, signer tier, action, and timestamp.

# Integration

```bash
gulp build --modules=rtdModule,c2paProvenanceRtdProvider
```

Ensure the WordPress theme or plugin outputs the meta tag:

```html
<meta name="c2pa-manifest-url" content="https://publisher.com/wp-json/c2pa-provenance/v1/images/manifest/42">
```

```javascript
pbjs.setConfig({
  realTimeData: {
    dataProviders: [{
      name: 'c2paProvenance',
      params: {
        // Optional: override manifest URL if the meta tag is not available
        // manifestUrl: 'https://publisher.com/wp-json/c2pa-provenance/v1/images/manifest/42'
      }
    }]
  }
});
```

# Data Injected

The following object is placed at `ortb2Fragments.global.site.ext.data.c2pa`:

```json
{
  "manifest_url": "https://publisher.com/wp-json/c2pa-provenance/v1/images/manifest/42",
  "verified": true,
  "signer_tier": "local",
  "action": "c2pa.created",
  "signed_at": "2026-03-12T00:00:00Z"
}
```

| Field | Source |
|---|---|
| `manifest_url` | The URL fetched |
| `verified` | `true` if manifest `status` equals `"ok"` |
| `signer_tier` | Manifest field `signerTier` (`local`, `connected`, or `byok`) |
| `action` | First entry in manifest `actions` array |
| `signed_at` | Manifest field `signedAt` |
