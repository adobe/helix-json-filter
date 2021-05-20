# Helix JSON Filter

> Service used to filter JSON data from a helix3 content bus

## Status
[![codecov](https://img.shields.io/codecov/c/github/adobe/helix-json-filter.svg)](https://codecov.io/gh/adobe/helix-json-filter)
[![CircleCI](https://img.shields.io/circleci/project/github/adobe/helix-json-filter.svg)](https://circleci.com/gh/adobe/helix-json-filter)
[![GitHub license](https://img.shields.io/github/license/adobe/helix-json-filter.svg)](https://github.com/adobe/helix-json-filter/blob/main/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/helix-json-filter.svg)](https://github.com/adobe/helix-json-filter/issues)
[![LGTM Code Quality Grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/adobe/helix-json-filter.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/adobe/helix-json-filter)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Installation

## Usage

```bash
curl https://helix-pages.anywhere.run/helix-services/json-filter@v1
```

For more, see the [API documentation](docs/API.md).

## Development

Please note that helix3 functions require authentication. in order to deploy manually and run the deploy tests, 
add the authorization to the test headers to your `.env` file. eg:

```
HLX_TEST_HEADERS={"authorization": "token xxxxxxxxxxyyyyyyyyyzzzzzzz"}
```

### Deploying Helix JSON Filter

All commits to main that pass the testing will be deployed automatically. All commits to branches that will pass the testing will get commited as `/helix-services/json-filter@ci<num>` and tagged with the CI build number.
