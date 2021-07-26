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
const wrap = require('@adobe/helix-shared-wrap');
const { logger } = require('@adobe/helix-universal-logger');
const { wrap: statusWrap } = require('@adobe/helix-status');
const { Response } = require('@adobe/helix-universal');
const { cleanupHeaderValue } = require('@adobe/helix-shared-utils');
const jsonFilter = require('./json-filter.js');
const fetchS3 = require('./fetch-s3.js');

function error(log, msg, status) {
  log.error(msg);
  return new Response('', {
    status,
    headers: {
      'x-error': cleanupHeaderValue(msg),
    },
  });
}

/**
 * This is the main function
 * @param {Request} request the request object (see fetch api)
 * @param {UniversalContext} context the context of the universal serverless function
 * @returns {Response} a response
 */
async function main(request, context) {
  const { log, pathInfo: { suffix = '' } } = context;
  const sp = new URL(request.url).searchParams;
  const params = Object.fromEntries(sp.entries());
  if (params.sheet) {
    params.sheet = sp.getAll('sheet');
  }
  const {
    contentBusId,
    contentBusPartition = 'live',
    limit,
    offset,
    sheet,
  } = params;

  // validate params and suffix
  if (!contentBusId) {
    return error(log, 'missing contentBusId', 400);
  }
  if (!suffix.endsWith('.json')) {
    return error(log, 'only json resources supported.', 400);
  }

  // validate and create filter
  if (limit === undefined && offset === undefined && sheet === undefined) {
    return error(log, 'no filter params specified. use direct access.', 400);
  }
  const filter = jsonFilter({
    limit: limit ? Number.parseInt(limit, 10) : undefined,
    offset: offset ? Number.parseInt(offset, 10) : undefined,
    sheet,
  }, log);

  // fetch data from content bus
  const key = `${contentBusId}/${contentBusPartition}${suffix}`;
  const dataResponse = await fetchS3('helix-content-bus', key, log);
  if (dataResponse.status !== 200) {
    return dataResponse;
  }

  // filter and return
  return filter(dataResponse);
}

module.exports.main = wrap(main)
  .with(statusWrap)
  .with(logger.trace)
  .with(logger);
