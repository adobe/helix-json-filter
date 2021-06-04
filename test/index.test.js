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
const { Request, Response } = require('@adobe/helix-universal');
const proxyquire = require('proxyquire');

const { main } = require('../src/index.js');

const TEST_DATA = [];
for (let i = 0; i < 50; i += 1) {
  const row = {};
  TEST_DATA.push(row);
  for (let j = 0; j < 4; j += 1) {
    row[`col${j}`] = `cell(${i},${j})`;
  }
}

const TEST_SINGLE_SHEET = {
  offset: 0,
  limit: TEST_DATA.length,
  total: TEST_DATA.length,
  data: TEST_DATA,
};

describe('Index Tests', () => {
  it('sends 400 for missing contentBusId', async () => {
    const result = await main(new Request('https://json-filter.com/'), { log: console, pathInfo: {} });
    assert.strictEqual(result.status, 400);
  });

  it('sends 400 for missing suffix', async () => {
    const result = await main(new Request('https://json-filter.com/?contentBusId=foobar'), {
      log: console,
      pathInfo: {
      },
    });
    assert.strictEqual(result.status, 400);
  });

  it('sends 400 for non json  suffix', async () => {
    const result = await main(new Request('https://json-filter.com/?contentBusId=foobar'), {
      log: console,
      pathInfo: {
        suffix: '/index.md',
      },
    });
    assert.strictEqual(result.status, 400);
  });

  it('sends 404 for missing query params', async () => {
    const result = await main(new Request('https://json-filter.com/?contentBusId=foobar'), {
      log: console,
      pathInfo: {
        suffix: '/index.json',
      },
    });
    assert.strictEqual(result.status, 400);
  });

  it('fetches correct content', async () => {
    const { main: proxyMain } = proxyquire('../src/index.js', {
      './fetch-s3.js': async (bucketId, key) => {
        assert.strictEqual(bucketId, 'foobar');
        assert.strictEqual(key, 'preview/index.json');
        return new Response(JSON.stringify(TEST_SINGLE_SHEET), {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        });
      },
    });

    const resp = await proxyMain(new Request('https://json-filter.com/?contentBusId=foobar&contentBusPartition=preview&limit=10&offset=5'), {
      log: console,
      pathInfo: {
        suffix: '/index.json',
      },
    });
    assert.strictEqual(resp.status, 200);
    assert.deepStrictEqual(await resp.json(), {
      ':type': 'sheet',
      offset: 5,
      limit: 10,
      total: TEST_DATA.length,
      data: TEST_DATA.slice(5, 15),
    });
    assert.deepStrictEqual(resp.headers.plain(), {
      'content-type': 'application/json',
    });
  });

  it('handles error from content', async () => {
    const { main: proxyMain } = proxyquire('../src/index.js', {
      './fetch-s3.js': async () => new Response('', { status: 404 }),
    });

    const resp = await proxyMain(new Request('https://json-filter.com/?contentBusId=foobar&contentBusPartition=preview&limit=10&offset=5'), {
      log: console,
      pathInfo: {
        suffix: '/index.json',
      },
    });
    assert.strictEqual(resp.status, 404);
  });

  it('handles error from filter', async () => {
    const { main: proxyMain } = proxyquire('../src/index.js', {
      './fetch-s3.js': async () => new Response(JSON.stringify(TEST_SINGLE_SHEET), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
      './json-filter.js': () => () => new Response('', { status: 404 }),
    });

    const resp = await proxyMain(new Request('https://json-filter.com/?contentBusId=foobar&contentBusPartition=preview&limit=10&offset=5'), {
      log: console,
      pathInfo: {
        suffix: '/index.json',
      },
    });
    assert.strictEqual(resp.status, 404);
  });

  it('creates correct filter with no offset', async () => {
    const { main: proxyMain } = proxyquire('../src/index.js', {
      './fetch-s3.js': async () => new Response(JSON.stringify(TEST_SINGLE_SHEET), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
      './json-filter.js': (query) => {
        assert.strictEqual(query.limit, 10);
        assert.strictEqual(query.offset, undefined);
        assert.strictEqual(query.sheet, undefined);
        return () => new Response('', { status: 200 });
      },
    });

    const resp = await proxyMain(new Request('https://json-filter.com/?contentBusId=foobar&contentBusPartition=preview&limit=10'), {
      log: console,
      pathInfo: {
        suffix: '/index.json',
      },
    });
    assert.strictEqual(resp.status, 200);
  });

  it('creates correct filter with no limit', async () => {
    const { main: proxyMain } = proxyquire('../src/index.js', {
      './fetch-s3.js': async () => new Response(JSON.stringify(TEST_SINGLE_SHEET), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
      './json-filter.js': (query) => {
        assert.strictEqual(query.limit, undefined);
        assert.strictEqual(query.offset, 10);
        assert.strictEqual(query.sheet, undefined);
        return () => new Response('', { status: 200 });
      },
    });

    const resp = await proxyMain(new Request('https://json-filter.com/?contentBusId=foobar&contentBusPartition=preview&offset=10'), {
      log: console,
      pathInfo: {
        suffix: '/index.json',
      },
    });
    assert.strictEqual(resp.status, 200);
  });

  it('creates correct filter with multiple sheets', async () => {
    const { main: proxyMain } = proxyquire('../src/index.js', {
      './fetch-s3.js': async () => new Response(JSON.stringify(TEST_SINGLE_SHEET), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
      './json-filter.js': (query) => {
        assert.strictEqual(query.limit, undefined);
        assert.strictEqual(query.offset, undefined);
        assert.deepStrictEqual(query.sheet, ['sheet1', 'sheet2']);
        return () => new Response('', { status: 200 });
      },
    });

    const resp = await proxyMain(new Request('https://json-filter.com/?contentBusId=foobar&contentBusPartition=preview&sheet=sheet1&sheet=sheet2'), {
      log: console,
      pathInfo: {
        suffix: '/index.json',
      },
    });
    assert.strictEqual(resp.status, 200);
  });

  it('creates correct filter with single sheet', async () => {
    const { main: proxyMain } = proxyquire('../src/index.js', {
      './fetch-s3.js': async () => new Response(JSON.stringify(TEST_SINGLE_SHEET), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
      './json-filter.js': (query) => {
        assert.strictEqual(query.limit, undefined);
        assert.strictEqual(query.offset, undefined);
        assert.deepStrictEqual(query.sheet, ['sheet1']);
        return () => new Response('', { status: 200 });
      },
    });

    const resp = await proxyMain(new Request('https://json-filter.com/?contentBusId=foobar&contentBusPartition=preview&sheet=sheet1'), {
      log: console,
      pathInfo: {
        suffix: '/index.json',
      },
    });
    assert.strictEqual(resp.status, 200);
  });

  const testjson = {
    countries: [
      {
        Code: 'JP',
        Country: 'Japan',
        Number: 3,
      },
      {
        Code: 'DE',
        Country: 'Germany',
        Number: 5,
      },
      {
        Code: 'US',
        Country: 'USA',
        Number: 7,
      },
      {
        Code: 'CH',
        Country: 'Switzerland',
        Number: 27,
      },
      {
        Code: 'FR',
        Country: 'France',
        Number: 99,
      },
      {
        Code: 'AUS',
        Country: 'Australia',
        Number: 12,
      },
    ],
    abc: [
      {
        A: 112,
        B: 224,
        C: 135,
      },
      {
        A: 2244,
        B: 234,
        C: 53,
      },
    ],
  };

  it('test', async () => {
    const { main: proxyMain } = proxyquire('../src/index.js', {
      './fetch-s3.js': async () => new Response(JSON.stringify(testjson), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    });

    const resp = await proxyMain(new Request('https://json-filter.com/?contentBusId=foobar&contentBusPartition=preview&sheet=countries&offset=2&limit=1'), {
      log: console,
      pathInfo: {
        suffix: '/index.json',
      },
    });
    assert.strictEqual(resp.status, 500);
  });
});
