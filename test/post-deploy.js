/*
 * Copyright 2019 Adobe. All rights reserved.
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
/* eslint-disable no-unused-expressions */

const querystring = require('querystring');
const chai = require('chai');
const chaiHttp = require('chai-http');
const { createTargets } = require('./post-deploy-utils.js');

chai.use(chaiHttp);
const { expect } = chai;

const SINGLE_SHEET_PATH = '/data-embed-unit-tests/example-data.json';

const MULTI_SHEET_PATH = '/data-embed-unit-tests/multisheet.json';

const DEFAULT_PARAMS = {
  // https://adobe.sharepoint.com/sites/cg-helix/Shared%20Documents/Forms/AllItems.aspx
  contentBusId: 'h3d4b1d4ea6d84b0229bce7cf6806b0bb3470489ab8205a13f75cfe518fa7',
};

createTargets().forEach((target) => {
  describe(`Post-Deploy Tests (${target.title()})`, () => {
    it('filters a single sheet', async () => {
      const path = `${target.urlPath()}${SINGLE_SHEET_PATH}?${querystring.encode({
        ...DEFAULT_PARAMS,
        limit: 4,
      })}`;

      const req = chai
        .request(target.host())
        .get(path);

      // todo: move to utils ?
      if (process.env.HLX_TEST_HEADERS) {
        const headers = JSON.parse(process.env.HLX_TEST_HEADERS);
        Object.entries(headers).forEach(([key, value]) => req.set(key, value));
      }
      await req
        .then((response) => {
          expect(response).to.have.status(200);
          expect(response.body).to.deep.eql({
            ':type': 'sheet',
            data: [
              { Code: 'JP', Country: 'Japan', Number: 3 },
              { Code: 'DE', Country: 'Germany', Number: 5 },
              { Code: 'US', Country: 'USA', Number: 7 },
              { Code: 'CH', Country: 'Switzerland', Number: 27 },
            ],
            limit: 4,
            offset: 0,
            total: 6,
          });
        }).catch((e) => {
          throw e;
        });
    }).timeout(50000);

    it('filters a multi sheet', async () => {
      const path = `${target.urlPath()}${MULTI_SHEET_PATH}?${querystring.encode({
        ...DEFAULT_PARAMS,
        limit: 1,
      })}`;

      const req = chai
        .request(target.host())
        .get(path);

      if (process.env.HLX_TEST_HEADERS) {
        const headers = JSON.parse(process.env.HLX_TEST_HEADERS);
        Object.entries(headers).forEach(([key, value]) => req.set(key, value));
      }
      await req
        .then((response) => {
          expect(response).to.have.status(200);
          expect(response.body).to.deep.eql({
            ':names': [
              '日本',
              'tables',
              'foo',
            ],
            ':type': 'multi-sheet',
            ':version': 3,
            foo: {
              data: [{ Code: 'JP', Country: 'Japan', Number: 3 }],
              limit: 1,
              offset: 0,
              total: 6,
            },
            tables: {
              data: [{
                '': '', A: 112, B: 224, C: 135,
              }],
              limit: 1,
              offset: 0,
              total: 10,
            },
            日本: {
              data: [{ Code: 'JP', Country: 'Japan', Number: 3 }],
              limit: 1,
              offset: 0,
              total: 1,
            },
          });
        }).catch((e) => {
          throw e;
        });
    }).timeout(50000);

    it('selects single sheet from a multi sheet', async () => {
      const path = `${target.urlPath()}${MULTI_SHEET_PATH}?${querystring.encode({
        ...DEFAULT_PARAMS,
        limit: 1,
        sheet: '日本',
      })}`;

      const req = chai
        .request(target.host())
        .get(path);

      if (process.env.HLX_TEST_HEADERS) {
        const headers = JSON.parse(process.env.HLX_TEST_HEADERS);
        Object.entries(headers).forEach(([key, value]) => req.set(key, value));
      }
      await req
        .then((response) => {
          expect(response).to.have.status(200);
          expect(response.body).to.deep.eql({
            ':type': 'sheet',
            data: [
              { Code: 'JP', Country: 'Japan', Number: 3 },
            ],
            limit: 1,
            offset: 0,
            total: 1,
          });
        }).catch((e) => {
          throw e;
        });
    }).timeout(50000);

    it('selects wrong sheet from a multi sheet', async () => {
      const path = `${target.urlPath()}${MULTI_SHEET_PATH}?${querystring.encode({
        ...DEFAULT_PARAMS,
        limit: 1,
        sheet: 'does-not-exist',
      })}`;

      const req = chai
        .request(target.host())
        .get(path);

      if (process.env.HLX_TEST_HEADERS) {
        const headers = JSON.parse(process.env.HLX_TEST_HEADERS);
        Object.entries(headers).forEach(([key, value]) => req.set(key, value));
      }
      await req
        .then((response) => {
          expect(response).to.have.status(404);
          expect(response.headers['x-error']).to.eql('filtered result does not contain selected sheet(s): does-not-exist');
        }).catch((e) => {
          throw e;
        });
    }).timeout(50000);

    /**
     * Since we don't know the sheet name of the original single sheet, using a sheet selector
     * is irrelevant.
     * alternatively, it could always respond with 404 if a sheet selector is specified.
     */
    it('selects sheet from a single sheet', async () => {
      const path = `${target.urlPath()}${SINGLE_SHEET_PATH}?${querystring.encode({
        ...DEFAULT_PARAMS,
        limit: 1,
        sheet: 'does-not-exist',
      })}`;

      const req = chai
        .request(target.host())
        .get(path);

      // todo: move to utils ?
      if (process.env.HLX_TEST_HEADERS) {
        const headers = JSON.parse(process.env.HLX_TEST_HEADERS);
        Object.entries(headers).forEach(([key, value]) => req.set(key, value));
      }
      await req
        .then((response) => {
          expect(response).to.have.status(200);
          expect(response.body).to.deep.eql({
            ':type': 'sheet',
            data: [
              { Code: 'JP', Country: 'Japan', Number: 3 },
            ],
            limit: 1,
            offset: 0,
            total: 6,
          });
        }).catch((e) => {
          throw e;
        });
    }).timeout(50000);
  });
});
