AWS Analytics
=============

**🚨🚨🚨 Work In Progress 🚨🚨🚨**

This plugin integrates WordPress with AWS Pinpoint and provides an extensible tracker out of the box.

In addition to this it provides an A/B and multivariate testing system. Tests can be created programmatically and are applied on the client side.

## Infrastructure

A specific infrastructure set up is required to use this plugin:

- AWS Kinesis Firehose
  - Backing up to AWS S3 Bucket
  - Sending data to AWS Elasticsearch Instance to an index called `analytics`
- AWS Pinpoint Project
  - Event stream configured to point to above Kinesis Firehose
  - Associated Cognito Identity Pool ID

## Build process

To use the plugin from a direct clone you will need to run the build steps:

```
npm install
npm run build
```

To use the dev server do:

```
npm run start
```

## Configuration

You must define the following constants:

```php
define( 'HM_ANALYTICS_PINPOINT_ID', '...' );
define( 'HM_ANALYTICS_PINPOINT_REGION', '...' );
define( 'HM_ANALYTICS_COGNITO_ID', '...' );
define( 'HM_ANALYTICS_COGNITO_REGION', '...' );
```

### Custom enpoints

If you wish to test locally you can use the following constants to override the service endpoints:

```php
define( 'HM_ANALYTICS_PINPOINT_ENDPOINT', 'your-pinpoint-endpoint.com' );
define( 'HM_ANALYTICS_COGNITO_ENDPOINT', 'your-cognito-endpoint.com' );
```

The `humanmade/local-pinpoint` docker image provides a local 'fake' version of the pinpoint API.

```bash
docker pull humanmade/local-pinpoint
docker run \
  --name local-pinpoint \
  -e ELASTICSEARCH_HOST=<your elasticsearch instance url> \
  -p 3000 \
  humanmade/local-pinpoint
```

You can then point the above endpoint constants to `http://localhost:3000/cognito` and `http://localhost:3000/pinpoint` respectively.
