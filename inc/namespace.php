<?php
/**
 * Altis Analytics.
 *
 * @package aws-analytics
 */

namespace Altis\Analytics;

use Altis\Analytics\Utils;
use Aws\S3\S3Client;
use DateInterval;
use DateTime;
use Exception;

/**
 * Set up the plugin.
 */
function setup() {
	// Setup audiences.
	Audiences\setup();

	// Set up preview.
	Preview\setup();

	// Set up export.
	Export\setup();

	// Set up experiments.
	Experiments\setup();

	// Enable Experience Blocks.
	Blocks\setup();

	// Set up the Analytics Dashboard.
	Dashboard\setup();

	// Handle async scripts.
	add_filter( 'script_loader_tag', __NAMESPACE__ . '\\async_scripts', 20, 2 );
	// Load analytics scripts super early.
	add_action( 'wp_head', __NAMESPACE__ . '\\enqueue_scripts', 0 );
	// Remove indexes & data older than a set threshold.
	add_action( 'altis.analytics.index_maintenance', __NAMESPACE__ . '\\delete_old_indexes' );
	add_action( 'altis.analytics.long_term_storage_maintenance', __NAMESPACE__ . '\\clean_s3_store' );
	// Check whether we are previewing a page.
	add_filter( 'altis.analytics.noop', __NAMESPACE__ . '\\check_preview' );
	// Schedule cron tasks.
	add_action( 'init', __NAMESPACE__ . '\\schedule_events' );
}

/**
 * Schedule common maintenance tasks.
 */
function schedule_events() {
	if ( defined( 'WP_INSTALLING' ) && WP_INSTALLING ) {
		return;
	}

	if ( function_exists( 'is_main_site' ) && ! is_main_site() ) {
		return;
	}

	if ( function_exists( 'is_main_network' ) && ! is_main_network() ) {
		return;
	}

	/**
	 * Schedule index maintenance daily at midnight.
	 */
	if ( ! wp_next_scheduled( 'altis.analytics.index_maintenance' ) ) {
		wp_schedule_event( strtotime( 'midnight tomorrow' ), 'daily', 'altis.analytics.index_maintenance' );
	}
	if ( ! wp_next_scheduled( 'altis.analytics.long_term_storage_maintenance' ) ) {
		wp_schedule_event( strtotime( 'midnight tomorrow' ), 'daily', 'altis.analytics.long_term_storage_maintenance' );
	}
}

/**
 * Filter to check if current page is a preview.
 *
 * @return bool
 */
function check_preview() : bool {
	return is_preview();
}

/**
 * Returns contextual data to be associated with the user's endpoint
 * as well as custom attributes and metrics to record with every
 * analytics event.
 *
 * @uses apply_filters( 'hm.analytics.data.endpoint', $endpoint );
 * @uses apply_filters( 'hm.analytics.data.attributes', $attributes );
 * @uses apply_filters( 'hm.analytics.data', $data );
 *
 * @return array
 */
function get_client_side_data() : array {
	// Initialise data array.
	$data = [
		'Endpoint' => [],
		'AppPackageName' => sanitize_key( get_bloginfo( 'name' ) ),
		'AppVersion' => '',
		'SiteName' => get_bloginfo( 'name' ),
		'Attributes' => [],
		'Metrics' => [],
	];

	if ( is_user_logged_in() ) {
		$user = wp_get_current_user();
		$data['Endpoint']['User'] = [];
		$data['Endpoint']['User']['UserId'] = $user->get( 'ID' );
		$data['Endpoint']['User']['UserAttributes'] = [
			'Roles' => array_keys( $user->caps ),
		];
	}

	if ( is_front_page() ) {
		$data['Attributes']['frontPage'] = true;
	}

	if ( is_404() ) {
		$data['Attributes']['404'] = true;
	}

	if ( is_singular() ) {
		$data['Attributes']['postType'] = get_queried_object()->post_type;
		$data['Attributes']['postId'] = get_queried_object_id();

		$author = get_user_by( 'id', get_queried_object()->post_author );
		if ( $author ) {
			$data['Attributes']['author'] = $author->get( 'user_nicename' );
			$data['Attributes']['authorId'] = $author->get( 'ID' );
		}
	}

	if ( is_archive() ) {
		$data['Attributes']['archive'] = true;

		if ( is_date() ) {
			$data['Attributes']['archiveType'] = 'date';
			$data['Attributes']['date'] = get_the_date();
		}

		if ( is_search() ) {
			$data['Attributes']['archiveType'] = 'search';
			$data['Attributes']['search'] = get_search_query();
		}

		if ( is_post_type_archive() ) {
			$data['archiveType'] = get_post_type();
		}

		if ( is_tag() || is_category() || is_tax() ) {
			$data['Attributes']['archiveType'] = get_queried_object()->taxonomy;
			$data['Attributes']['term'] = get_queried_object()->slug;
		}

		if ( is_author() ) {
			$data['Attributes']['archiveType'] = 'author';
			$data['Attributes']['author'] = get_queried_object()->user_nicename;
		}
	}

	if ( is_multisite() ) {
		$data['Attributes']['blog'] = home_url();
		$data['Attributes']['network'] = network_home_url();
		$data['Attributes']['blogId'] = get_current_blog_id();
		$data['Attributes']['networkId'] = get_current_network_id();
	}

	/**
	 * Filter the custom analytics endpoint/user data.
	 *
	 * @param array $data
	 */
	$data['Endpoint'] = (object) apply_filters( 'altis.analytics.data.endpoint', $data['Endpoint'] );

	/**
	 * Filter the custom analytics attributes to record with all events.
	 *
	 * @param array $data
	 */
	$data['Attributes'] = (object) apply_filters( 'altis.analytics.data.attributes', $data['Attributes'] );

	/**
	 * Filter the custom analytics metrics to record with all events.
	 *
	 * @param array $data
	 */
	$data['Metrics'] = (object) apply_filters( 'altis.analytics.data.metrics', $data['Metrics'] );

	/**
	 * Filter the custom analytics variable data.
	 *
	 * @param array $data
	 */
	$data = apply_filters( 'altis.analytics.data', $data );

	return $data;
}

/**
 * Adds an async attribute to the script tag output.
 *
 * @param string $tag The enqueued HTML script tag.
 * @param string $handle The script handle.
 * @return string The script tag markup.
 */
function async_scripts( string $tag, string $handle ) : string {
	global $wp_scripts;

	if ( ! $wp_scripts->get_data( $handle, 'async' ) || strpos( $tag, 'async' ) !== false ) {
		return $tag;
	}

	$tag = str_replace( '></script>', ' async></script>', $tag );

	return $tag;
}

/**
 * Queue up the tracker script and required configuration.
 */
function enqueue_scripts() {
	global $wp_scripts;

	/**
	 * If true prevents any analytics events from actually being sent
	 * to Pinpoint. Useful in situations such as previewing content.
	 *
	 * @param bool $noop Set to true to prevent any analytics events being recorded.
	 */
	$noop = (bool) apply_filters( 'altis.analytics.noop', false );

	/**
	 * Filters whether the consent cookie should be used.
	 *
	 * @param string $consent_enabled If set to true adds support for the WP consent API.
	 */
	$consent_enabled = (bool) apply_filters( 'altis.analytics.consent_enabled', defined( 'WP_CONSENT_API_URL' ) );

	/**
	 * Filters the consent cookie prefix to integrate with the WordPress Consent API.
	 *
	 * @param string $cookie_prefix The consent cookie prefix.
	 */
	$consent_cookie_prefix = apply_filters( 'wp_consent_cookie_prefix', 'wp_consent' );

	wp_enqueue_script( 'altis-analytics', Utils\get_asset_url( 'analytics.js' ), [], null, false );
	wp_add_inline_script(
		'altis-analytics',
		sprintf(
			'var Altis = Altis || {}; Altis.Analytics = %s;' .
			'Altis.Analytics.onReady = function ( callback ) {' .
				'if ( Altis.Analytics.Ready ) {' .
					'callback();' .
				'} else {' .
					'window.addEventListener( \'altis.analytics.ready\', callback );' .
				'}' .
			'};',
			wp_json_encode(
				[
					'Ready' => false,
					'Consent' => [
						'CookiePrefix' => $consent_cookie_prefix,
						'Enabled' => $consent_enabled,
					],
					'Config' => [
						'PinpointId' => defined( 'ALTIS_ANALYTICS_PINPOINT_ID' ) ? ALTIS_ANALYTICS_PINPOINT_ID : null,
						'PinpointRegion' => defined( 'ALTIS_ANALYTICS_PINPOINT_REGION' ) ? ALTIS_ANALYTICS_PINPOINT_REGION : null,
						'PinpointEndpoint' => defined( 'ALTIS_ANALYTICS_PINPOINT_ENDPOINT' ) ? ALTIS_ANALYTICS_PINPOINT_ENDPOINT : null,
						'CognitoId' => defined( 'ALTIS_ANALYTICS_COGNITO_ID' ) ? ALTIS_ANALYTICS_COGNITO_ID : null,
						'CognitoRegion' => defined( 'ALTIS_ANALYTICS_COGNITO_REGION' ) ? ALTIS_ANALYTICS_COGNITO_REGION : null,
						'CognitoEndpoint' => defined( 'ALTIS_ANALYTICS_COGNITO_ENDPOINT' ) ? ALTIS_ANALYTICS_COGNITO_ENDPOINT : null,
					],
					'Noop' => $noop,
					'Data' => (object) get_client_side_data(),
					'Audiences' => Audiences\get_audience_config(),
				]
			)
		),
		'before'
	);

	// Load async for performance.
	$wp_scripts->add_data( 'altis-analytics', 'async', true );

	/**
	 * Create our own early hook for queueing
	 */
	do_action( 'altis.analytics.enqueue_scripts' );

	// Print queued scripts.
	print_head_scripts();
}

/**
 * Delete old Analytics indexes in Elasticsearch.
 */
function delete_old_indexes() {

	/**
	 * Filter the maximum index age for data retention in days.
	 *
	 * @param int $max_age Maximum number of days to keep analytics data for.
	 */
	$max_age = (int) apply_filters( 'altis.analytics.max_index_age', 90 );

	// If age has been set out of the 90-day limit, default to 7 days and warn user.
	if ( $max_age < 7 || $max_age > 90 ) {
		$max_age = max( 7, min( 90, $max_age ) );
		trigger_error(
			sprintf( 'Analytics data retention period must be between 7 and 90 days, defaulting to %d.', $max_age ),
			E_USER_WARNING
		);
	}

	// Get index name by date.
	$date = new DateTime( 'midnight' );
	$date->sub( new DateInterval( 'P' . $max_age . 'D' ) );
	$max_age_date = $date->format( 'U' );

	// Get indices.
	$indices_response = wp_remote_get( Utils\get_elasticsearch_url() . '/analytics-*?filter_path=*.aliases' );
	if ( is_wp_error( $indices_response ) ) {
		trigger_error( sprintf(
			'Analytics: Could not fetch analytics indexes: %s',
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			$indices_response->get_error_message()
		), E_USER_WARNING );
		return;
	}
	if ( wp_remote_retrieve_response_code( $indices_response ) !== 200 ) {
		trigger_error( sprintf(
			"Analytics: ElasticSearch index deletion failed:\n%s",
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			wp_remote_retrieve_body( $indices_response )
		), E_USER_WARNING );
		return;
	}

	$indices = json_decode( wp_remote_retrieve_body( $indices_response ), true );
	$index_names = array_keys( $indices );

	$indices_to_remove = array_filter( $index_names, function ( $name ) use ( $max_age_date ) {
		$date = trim( str_replace( 'analytics', '', $name ), '-' );
		return strtotime( $date ) < $max_age_date;
	} );

	// Create new deletion URL.
	$response = wp_remote_request( Utils\get_elasticsearch_url() . '/' . implode( ',', $indices_to_remove ), [
		'method' => 'DELETE',
	] );

	// Check for failures.
	if ( is_wp_error( $response ) ) {
		trigger_error( sprintf(
			'Analytics: ElasticSearch index deletion failed: %s',
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			$response->get_error_message()
		), E_USER_WARNING );
	}
	if ( wp_remote_retrieve_response_code( $response ) !== 200 ) {
		trigger_error( sprintf(
			"Analytics: ElasticSearch index deletion failed:\n%s",
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			wp_remote_retrieve_body( $response )
		), E_USER_WARNING );
	}
}

/**
 * Clean up S3 long term data storage.
 *
 * @return void
 */
function clean_s3_store() : void {

	// These constants are required to continue.
	if ( ! defined( 'ALTIS_ANALYTICS_PINPOINT_BUCKET_ARN' ) ) {
		return;
	}
	if ( ! defined( 'ALTIS_ANALYTICS_PINPOINT_BUCKET_REGION' ) ) {
		return;
	}

	/**
	 * Filter the maximum S3 storage age for data retention in days.
	 *
	 * Defaults to 90 days in keeping with the Pinpoint default.
	 *
	 * @param int $max_age Maximum number of days to keep analytics data for.
	 */
	$max_age = (int) apply_filters( 'altis.analytics.max_s3_backup_age', 90 );

	// Max age date.
	$date = new DateTime( 'midnight' );
	$date->sub( new DateInterval( 'P' . $max_age . 'D' ) );
	$max_age_date = $date->format( 'U' );

	// Get S3 client.
	$params = [
		'version' => '2006-03-01',
		'region' => ALTIS_ANALYTICS_PINPOINT_BUCKET_REGION,
	];

	// Add defined credentials if available.
	if ( defined( 'ALTIS_ANALYTICS_S3_KEY' ) && defined( 'ALTIS_ANALYTICS_S3_SECRET' ) ) {
		$params['credentials'] = [
			'key' => ALTIS_ANALYTICS_S3_KEY,
			'secret' => ALTIS_ANALYTICS_S3_SECRET,
		];
	}

	// Allow overriding the S3 endpoint.
	if ( defined( 'ALTIS_ANALYTICS_S3_ENDPOINT' ) ) {
		$params['endpoint'] = ALTIS_ANALYTICS_S3_ENDPOINT;
	}

	/**
	 * Filter the Analytics S3 client params.
	 *
	 * @param array $params The parameters used to instantiate the S3Client object.
	 */
	$params = apply_filters( 'altis.analytics.s3_client_params', $params );

	$client = new S3Client( $params );

	/**
	 * Filter the S3 client used by the AWS Analytics plugin.
	 *
	 * @param Aws\S3\S3Client $client The S3Client object.
	 * @param array $params The default params passed to the client.
	 */
	$client = apply_filters( 'altis.analytics.s3_client', $client, $params );

	// Fetch first batch of items.
	try {
		$max_keys = 1000;
		$key_count = $max_keys;
		$continuation_token = false;

		// Collect an array of keys to delete.
		$keys_to_delete = [];

		while ( $key_count === 1000 ) {
			$list_params = [
				'Bucket' => ALTIS_ANALYTICS_PINPOINT_BUCKET_ARN,
				'MaxKeys' => $max_keys,
			];

			// Add continuation token if we have one.
			if ( $continuation_token ) {
				$list_params['ContinuationToken'] = $continuation_token;
			}

			$result = $client->listObjectsV2( $list_params );

			// Update key count with returned number of keys.
			$key_count = $result['KeyCount'];

			// Update continuation token.
			if ( $result['IsTruncated'] ) {
				$continuation_token = $result['NextContinuationToken'];
			}

			// Store keys to delete.
			foreach ( $result['Contents'] as $item ) {
				// Check prefix matches a date.
				if ( ! preg_match( '#^(\d{4}/\d{2}/\d{2})#', $item['Key'], $date_match ) ) {
					continue;
				}

				// If the data is newer than the max age then continue.
				if ( strtotime( $date_match[1] ) >= $max_age_date ) {
					continue;
				}

				$keys_to_delete[] = [ 'Key' => $item['Key'] ];
			}
		}

		// Nothing more to do if there's nothing to delete.
		if ( empty( $keys_to_delete ) ) {
			return;
		}

		// Delete the old objects.
		$chunks_to_delete = array_chunk( $keys_to_delete, 1000 );

		foreach ( $chunks_to_delete as $chunk ) {
			$client->deleteObjects( [
				'Bucket' => ALTIS_ANALYTICS_PINPOINT_BUCKET_ARN,
				'Delete' => [
					'Quiet' => true,
					'Objects' => $chunk,
				],
			] );
		}
	} catch ( Exception $error ) {
		// Log the error.
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		trigger_error( $error->getMessage(), E_USER_WARNING );
	}
}
