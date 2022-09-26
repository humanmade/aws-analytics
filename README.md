AWS Analytics
=============

This plugin integrates WordPress with [AWS Pinpoint](https://aws.amazon.com/pinpoint/) and provides an extensible tracker out of the box.

It also automatically integrates with the [WP Consent Level API plugin](https://github.com/rlankhorst/wp-consent-level-api) or the [client side only version](https://github.com/humanmade/consent-api-js) maintained by Human Made. At least the `statistics-anonymous` category must be consented to for any tracking to occur and `statistics` is required for tracking personally identifiable information.

## Usage

### In JavaScript

Once installed the plugin will queue up an analytics tracker script that provides a few client side functions you can use:

#### API

**`Altis.Analytics.onReady( callback <function> )`**

Use this function to ensure analytics has loaded before making calls to `registerAttribute()` or `record()`.

**`Altis.Analytics.updateEndpoint( data <object> )`**

Updates the data associated with the current user. Use this to provide updated custom user attributes and metrics, a user ID, and demographic data.

**Important**: If used in conjunction with the WP Consent API all data passed to this function under the `User` property is removed. You should only store personally identifiable information under the `User.UserId` and `User.UserAttributes` properties. All other endpoint data as outlined further down should only be used for anonymous demographic data.

**`Altis.Analytics.getEndpoint()`**

Returns the current endpoint data object.

**`Altis.Analytics.record( eventName <string> [, data <object> [, endpoint <object>]] )`**

Records an event. The data passed in should be an object with either or both an `attributes` property and `metrics` property:

```js
{
  attributes: {
    name: 'value', // <string>
    // ...
  },
  metrics: {
    name: 1 // <number>
    // ...
  },
}
```

The optional 3rd parameter allows you to simulataneously update the endpoint data as if calling `Altis.Analytics.updateEndpoint()`. These attributes, metrics and endpoint data can be later queried via Elasticsearch.

**`Altis.Analytics.updateAudiences()`**

Synchronises the current audiences associated with the page session. You shouldn't ever need to call this manually but it is called any time `updateEndpoint()`, `registerAttribute()` or `registerMetric()` are called. You can hook into the `updateAudiences` event to respond to changes in this data.

**`Altis.Analytics.getAudiences()`**

Retrieves an array of the audience IDs for the current page session.

#### Adding global attributes and metrics

**`Altis.Analytics.registerAttribute( name <string>, value <string | callback> )`**

Sometimes you may want to record a dynamic attribute value for all events on the page. The `registerAttribute()` function allows this. Values must be a single string. If a function is passed as the value will be evaluated at the time an event recorded. Promises are supported as a return value.

**`Altis.Analytics.registerMetric( name <string>, value <number | callback> )`**

Similar to `registerAttribute()` above but for numbers.

#### Events

**`Altis.Analytics.on( event <string>, callback <callback> ) : EventListener`**

Attaches and returns an event listener. The available events and their callback arguments are:

- `updateEndpoint`<br />
  Called any time the current endpoint data is updated. The callback receives the endpoint object.<br />
  ```
  Altis.Analytics.on( 'updateEndpoint', function ( endpoint ) {
    console.log( endpoint.Demographic ); // { Platform: 'Mac OS', .... }
  } );
  ```
- `record`:
  Called any time an event is recorded. The callback receives the pinpoint event object.<br />
  ```
  Altis.Analytics.on( 'record', function ( event ) {
    console.log( event.Attributes, event.event_type ); // { referer: '', ... }, 'pageView'
  } );
  ```
- `updateAudiences`<br />
  Called any time the audiences are updated. The callback receives an array of audience IDs.<br />
  ```
  Altis.Analytics.on( 'updateAudiences', function ( audiences ) {
    console.log( audiences ); // [ 1, 2, 3, ... ]
  } );
  ```

**`Altis.Analytics.off( listener <EventListener> )`**

Removes an event listener returned by `Altis.Analytics.on()`.

### Constants

ClickHouse connection constants:

- **`ALTIS_CLICKHOUSE_HOST`**: Host name for ClickHouse server.
- **`ALTIS_CLICKHOUSE_PORT`**: Port to connect to ClickHouse on.
- **`ALTIS_CLICKHOUSE_USER`**: Username for authentication.
- **`ALTIS_CLICKHOUSE_PASS`**: Password for authentication.

**`ALTIS_ANALYTICS_LOG_QUERIES`**

Define as true to enable logging queries to the error log.

**`ALTIS_ANALYTICS_FALLBACK_CAPS`**

By default, Altis Analytics will grant any role who can edit pages the ability to edit audiences. You can explicitly remove the capabilities from a role (i.e. `'edit_audiences' => false`), but in some cases you may wish to remove this fallback entirely.

Define as false to disable the capability fallback to page capabilities.

### Filters

The plugin provides a few hooks for you to control the default endpoint data and attributes recorded with events.

**`altis.analytics.consent_enabled <bool>`**

This defaults to true if the WP Consent API plugin or a derivative is installed and active by checking if the constant `WP_CONSENT_API_URL` is defined.

**`altis.analytics.data.endpoint <array>`**

Allows you to provide server-side data used to update the visitors associated endpoint with custom attributes and demographic data. Mostly useful for providing extra data for logged in sessions such as IP based location data.

**`altis.analytics.data.attributes <array>`**

Allows you to provide server-side data recorded for all events on the page. Useful if you need to query records based on the page context.

**`altis.analytics.data.metrics <array>`**

Similar to the `altis.analytics.data.attributes` filter but allows you to pass metrics based on server-side data.

**`altis.analytics.data <array>`**

Filters the entire array passed to the client side.

**`altis.analytics.noop <bool>`**

Returning `false` from this filter will prevent any events or updated endpoint data from being sent to Pinpoint. The built in usage for this is to prevent logging events on page previews.

**`altis.analytics.exclude_bots <bool>`**

This defaults to true but can switched off to allow tracking bots that can run JavaScript, note this will affect your data.

You can check if a recorded event was created by a bot by checking if the `attributes.isBot` value exists.

**`altis.analytics.clickhouse.request_args <array>`**

Filters the arguments for `wp_remote_post()` when querying ClickHouse. Can be used to set the `timeout` for example:

```php
add_filter( 'altis.analytics.clickhouse.request_args', function ( $args, $query, $params, $body ) {
  $args['timeout'] = 60;
  return $args;
}, 10, 4 );
```

### Functions

**`Altis\Analytics\Utils\query( array $query, array $params = [], string $return = 'array', ?string $body = null ) : array`**

Queries the analytics data with the ClickHouse SQL provided in `$query`.

`$params` will be added as query string parameters to the request URL for parameterised queries. The parameters are interpolated into the SQL wherever the pattern `{<key>:<data type>}` is encountered.

Example:

```php
$result = Utils\query(
  "SELECT uniqCombined64(endpoint_id)
    FROM analytics
    WHERE blog_id = {blog_id:String}
      AND endpoint_metrics['pageViews'] >= {views:UInt16}
      AND attributes['postID'] IN {post_ids:Array(String)}",
  [
    'blog_id' => get_current_blog_id(),
    'views' => 3,
    'post_ids' => [ 1, 12, 34 ],
  ]
);
```

[See ClickHouse Data Types for more](https://clickhouse.com/docs/en/sql-reference/data-types/).

`$return` controls the format of the returned data. The options are:

- `array`: Default value. Returns an array of `stdClass` objects with properties matching the fields from the `SELECT` statement.
- `object`: Returns the first `stdClass` object from the array of results. Useful if your aggregation only returns a single row.
- `raw`: Returns the raw output from ClickHouse. The default format is line separated NDJSON but can be overridden using `FORMAT <format>` in the SQL query.

`$body` allows you to optionally pass a POST body with the request. Causes `$query` to be sent in the URL query string. In some cases this might be useful such as `INSERT` queries.

**`Altis\Analytics\Utils\milliseconds() : integer`**

Get the current time since the unix epoch in milliseconds.

**`Altis\Analytics\Utils\date_in_milliseconds( string $point_in_time, $round_to = 0 ) : integer`**

Get a date in milliseconds since the unix epoch, optionally rounded to the nearest number of seconds.

Example usage: `Utils\date_in_milliseconds( '-7 days', DAY_IN_SECONDS )`

## Querying Data

Data can be queried from ClickHouse using SQL plus its extra functions, providing a powerful tool for filtering and aggregating records. [See the ClickHouse SQL reference for more details](https://clickhouse.com/docs/en/sql-reference).

It is recommended to use the `Altis\Analytics\Utils\query()` function for this.

### Anatomy of an event record

A user session covers every event recorded between opening the website and closing it. For every event recorded the following data is recorded to the database.

- `app_id`: The Pinpoint Project ID. You likely won't need to use this directly.
- `blog_id`: The blog ID of the site recording events.
- `event_type`: The type of event recorded, eg. `pageView`, `click`, `_session.start` or `_session.stop`.
- `event_timestamp`: The timestamp in milliseconds of when the event was recorded on the site.
- `attributes`: An extensible key value map of strings.
  - `date`: ISO-8601 standard date string.
  - `session`: Unique ID across all page views.
  - `pageSession`: Unique ID for one page view.
  - `url`: The current page URL.
  - `hash`: The current URL hash.
  - `referer`: The page referer.
  - `network`: The current network's primary URL.
  - `networkId`: The current network's Id.
  - `blog`: The current site URL.
  - `blogId`: The current blog ID.
  - `qv_utm_campaign`: The Urchin Tracker campaign from the query string if set.
  - `qv_utm_source`: The Urchin Tracker source from the query string if set.
  - `qv_utm_medium`: The Urchin Tracker medium from the query string if set.
  - `qv_*`: Any query string parameters will be recorded with the prefix `qv_`.
  - Any attributes added via the `altis.analytics.data.attributes` filter.
  - Any attributes added via `Altis.Analytics.registerAttribute()` or passed to `Altis.Analytics.record()`.
- `metrics`: And extensible key value map of numbers.
  - `scrollDepthMax`: Maximum scroll depth on page so far. Percentage value between 1-100.
  - `scrollDepthNow`: Scroll depth at time of event. Percentage value between 1-100.
  - `elapsed`: Time elapsed in milliseconds since the start of the page view.
  - `day`: The day of the week, 1 being Sunday through to 7 being Saturday.
  - `hour`: The hour of the day in 24 hour format.
  - `month`: The month of the year.
  - Any metrics added via `Altis.Analytics.registerMetric()` or passed to `Altis.Analytics.record()`.
- `endpoint_id`: A unique UUID for the endpoint (current visitor's browser).
- `endpoint_address`: An optional target for push notifications such as an email address or phone number.
- `endpoint_optOut`: The push notification channels this visitor has opted out of. Defaults to "ALL".
- `endpoint_attributes`
  - Any custom attributes associated with this endpoint. Values are arrays of strings.
- `endpoint_metrics`
  - `sessions`: Number of separate browsing sessions for this endpoint.
  - `pageViews`: Number of total page views for this endpoint.
  - Any custom metrics associated with the endpoint.
- `app_version`: Current application version, can be provided via the `altis.analytics.data` filter.
- `locale`: Locale code of the endpoint, derived from the browser.
- `make`: Make of the current browser / browser engine eg. "Blink".
- `model`: Model of the current browser eg "Chrome"
- `model_version`: Browser version.
- `platform`: The device operating system.
- `platform_version`: The operating system version.
- `country`: The endpoint's country if known / available.
- `city`: The endpoint's city if known or available.
- `user_attributes`
  - Any custom attributes associated with the user if known. Values are arrays of strings.
- `user_id`: An ID associated with the user in your application. Useful for linking endpoints across devices.
- `session_id`: Persists for a subsession, triggered by page visibility changes. Recorded with `_session.start` and `_session.stop` events.
- `session_start`: Time in milliseconds when the subsession started. Recorded with `_session.start` events.
- `session_stop`: Time in milliseconds when the subsession ended. Recorded with `_session.stop` events.
- `session_duration`: Duration in milliseconds for a subsession. Recorded with `_session.stop` events.

### Top posts example

```php
<?php
$result = Altis\Analytics\Utils\query(
  "SELECT attributes['url'] as link, count() as views
    FROM analytics
    WHERE event_type = 'pageView'
      AND blog_id = {blog_id:String}
      AND event_timestamp >= toDateTime({since:UInt64})
    GROUP BY link
    ORDER BY views DESC",
  [
    'blog_id' => get_current_blog_id(),
    'since' => strtotime( '-7 days' ),
  ]
);
```

The output will be an array of `stdClass` objects with a `url` and `views` property. Something like the following:

```php
[
  (object)[ 'url' => 'http://example.com/', 'views' => 12882 ],
  (object)[ 'url' => 'http://example.com/sample-page/', 'views' => 2504 ],
  // ...
]
```

## Audiences

Audiences are user-defined categories of users, based on conditions related to their analytics data.

Audiences allow for the creation of conditions to narrow down event queries or endpoints but also can be used for determining effects on the client side.

### Mapping Event Data

To enable the use of any event record data in the audience editor it needs to be mapped to a human readable label using the `Altis\Analytics\Audiences\register_field()` function:

```php
use function Altis\Analytics\Audiences\register_field;

add_action( 'init', function () {
  register_field(
    'endpoint.Location.Country', // The endpoint object field for the front end.
    __( 'Country' ), // A label for the field.
    [ // Optional field arguments
      'column' => 'country', // The database column representing the data in the endpoint object.
      'description' => __( 'The visitor country.' ) // Optional description for the field.
      'options' => '\\Altis\\Analytics\\Utils\\get_countries', // A callback to provide prepopulated list of options.
      'disable_free_text' => false, // Whether to allow free text to be used or to restrict to available options.
    ]
  );
} );
```

In the above example the 1st parameter `endpoint.Location.Country` represents the field in the event record to query against. Other examples include `attributes.qv_utm_campaign` or `endpoint.User.UserAttibrutes.custom` for example.

The 2nd parameter is a human readable label for the audience field, and the 3rd is the human readable description that goes below the field UI.

The 4th parameter is an arguments array, which can include:

- `column` is the name of the column where the data can be found in the database.
- `options` which is a callback that returns a list of valid options, that will complement existing data for that field.
- `disable_free_text` is a boolean to allow/restrict the user to set custom strings rather than choose from the list.

## Required Infrastructure

A specific infrastructure set up is required to use this plugin:

- AWS Pinpoint Project
  - Event stream configured to point to below Kinesis Firehose
  - Associated Cognito Identity Pool ID
- ClickHouse Database

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
define( 'ALTIS_ANALYTICS_PINPOINT_ID', '...' );
define( 'ALTIS_ANALYTICS_PINPOINT_REGION', '...' );
```

### Custom enpoints

If you wish to test locally you can use the following constants to override the service endpoints:

```php
define( 'ALTIS_ANALYTICS_PINPOINT_ENDPOINT', 'your-pinpoint-endpoint.com' );
```

You can then point the above endpoint constants to `http://localhost:3000` and `http://localhost:3001` respectively.


------------------

Made with ❤️ by [Human Made](https://humanmade.com/)
