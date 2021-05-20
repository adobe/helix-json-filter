/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-env mocha */

const assert = require('assert');
const nock = require('nock');
const { promisify } = require('util');
const zlib = require('zlib');

const fetchS3 = require('../src/fetch-s3.js');

const gzip = promisify(zlib.gzip);

describe('Fetch S3 test', () => {
  beforeEach(() => {
    process.env.AWS_REGION = 'fake';
    process.env.AWS_ACCESS_KEY_ID = 'fake-key-id';
    process.env.AWS_SECRET_ACCESS_KEY = 'fake-secret';
  });

  it('needs bucket id', async () => {
    await assert.rejects(fetchS3(), new Error('Unknown bucketId, cannot fetch content'));
  });

  it('needs key', async () => {
    await assert.rejects(fetchS3('test-bucket'), new Error('Unknown key, cannot fetch content'));
  });

  it('can get content', async () => {
    const scope = nock('https://test-bucket.s3.fake.amazonaws.com')
      .get('/live/index.json?x-id=GetObject')
      .reply(200, '{ "welcome": 42 }', {
        'content-type': 'application/json',
        'last-modified': 'Wed, 12 Oct 2009 17:50:00 GMT',
      });

    const resp = await fetchS3('test-bucket', 'live/index.json', console);
    await scope.done();

    assert.strictEqual(resp.status, 200);
    assert.deepStrictEqual(await resp.json(), { welcome: 42 });
  });

  it('can get content w/o type', async () => {
    const scope = nock('https://test-bucket.s3.fake.amazonaws.com')
      .get('/live/index.json?x-id=GetObject')
      .reply(200, '{ "welcome": 42 }');

    const resp = await fetchS3('test-bucket', 'live/index.json', console);
    await scope.done();

    assert.strictEqual(resp.status, 200);
    assert.deepStrictEqual(await resp.json(), { welcome: 42 });
  });

  it('can get zipped content', async () => {
    const data = await gzip(Buffer.from('{ "welcome": 42 }', 'utf-8'));

    const scope = nock('https://test-bucket.s3.fake.amazonaws.com')
      .get('/live/index.json?x-id=GetObject')
      .reply(200, data, {
        'content-type': 'application/json',
        'content-encoding': 'gzip',
        'last-modified': 'Wed, 12 Oct 2009 17:50:00 GMT',
      });

    const resp = await fetchS3('test-bucket', 'live/index.json', console);
    await scope.done();

    assert.strictEqual(resp.status, 200);
    assert.deepStrictEqual(await resp.json(), { welcome: 42 });
  });

  it('handles 404 from s3', async () => {
    const scope = nock('https://test-bucket.s3.fake.amazonaws.com')
      .get('/live/index.json?x-id=GetObject')
      .reply(404);

    const resp = await fetchS3('test-bucket', 'live/index.json', console);
    await scope.done();

    assert.strictEqual(resp.status, 404);
  });

  it('handles AccessDenied from s3', async () => {
    const scope = nock('https://test-bucket.s3.fake.amazonaws.com')
      .get('/live/index.json?x-id=GetObject')
      .reply(403, '<?xml version="1.0" encoding="UTF-8"?><Error><Code>AccessDenied</Code><Message>Access Denied</Message></Error>');

    const resp = await fetchS3('test-bucket', 'live/index.json', console);
    await scope.done();

    assert.strictEqual(resp.status, 404);
  });

  it('handles 500 from s3', async () => {
    const scope = nock('https://test-bucket.s3.fake.amazonaws.com')
      .get('/live/index.json?x-id=GetObject')
      .reply(500);

    const resp = await fetchS3('test-bucket', 'live/index.json', console);
    await scope.done();

    assert.strictEqual(resp.status, 502);
  });
});
