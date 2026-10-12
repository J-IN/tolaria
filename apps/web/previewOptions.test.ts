import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isApiRequestPath,
  webPreviewAllowedHosts,
  webPreviewHost,
  webPreviewPort,
} from './previewOptions.ts'

describe('web preview options', () => {
  it('binds to loopback unless a host is requested', () => {
    assert.equal(webPreviewHost({}), '127.0.0.1')
    assert.equal(webPreviewHost({ TOLARIA_WEB_HOST: '   ' }), '127.0.0.1')
    assert.equal(webPreviewHost({ TOLARIA_WEB_HOST: ' 0.0.0.0 ' }), '0.0.0.0')
  })

  it('falls back to the default port for missing or invalid values', () => {
    assert.equal(webPreviewPort({}), 4173)
    assert.equal(webPreviewPort({ TOLARIA_WEB_PORT: '8080' }), 8080)
    for (const invalid of ['abc', '0', '-1', '80.5', '70000']) {
      assert.equal(webPreviewPort({ TOLARIA_WEB_PORT: invalid }), 4173, invalid)
    }
  })

  it('parses a comma-separated allowed-host list', () => {
    assert.deepEqual(webPreviewAllowedHosts({}), [])
    assert.deepEqual(
      webPreviewAllowedHosts({ TOLARIA_WEB_ALLOWED_HOSTS: ' box.tailnet.ts.net, ,ipad.local ' }),
      ['box.tailnet.ts.net', 'ipad.local'],
    )
  })

  it('treats only /api paths as API requests', () => {
    for (const url of ['/api', '/api/vault/ping', '/api/vault/list?path=x']) {
      assert.equal(isApiRequestPath(url), true, url)
    }
    for (const url of [undefined, '/', '/assets/index.js', '/apiary', '/notes/api/x']) {
      assert.equal(isApiRequestPath(url), false, String(url))
    }
  })
})
