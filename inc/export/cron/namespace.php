<?php
/**
 * Altis Analytics Data Export Cron Job.
 */

namespace Altis\Analytics\Export\Cron;

use Aws\S3\Exception\S3Exception;
use Aws\S3\S3Client;
use Altis\Analytics;

/**
 * Frequency of the export job
 */
const ALTIS_ANALYTICS_EXPORT_CRON_FREQUENCY = 'ten_minutes';
const ALTIS_ANALYTICS_EXPORT_CRON_FREQUENCY_INTERVAL = 600;

/**
 * Option name to keep last processed file information.
 */
const ALTIS_ANALYTICS_EXPORT_LAST_PROCESSED_KEY = 'altis.analytic.export.last_processed_key';

/**
 * Bootstrap the functionality.
 *
 * @return void
 */
function bootstrap() : void {

	/**
	 * Filter to allow disabling the functionality altogether.
	 *
	 * @param bool Whether to enable the data export cron job.
	 */
	if ( ! apply_filters( 'altis.analytics.export.cron.enabled', true ) ) {
		return;
	}

	// Setup cron interval.
	/* phpcs:ignore WordPress.WP.CronInterval.ChangeDetected */
	add_filter( 'cron_schedules', __NAMESPACE__ . '\setup_cron_interval' );

	// Hook our cron job handler.
	add_action( 'altis.analytics.export.cron', __NAMESPACE__ . '\cron_handler' );

	/**
	 * Filter the cron job schedule interval.
	 *
	 * @param string Cron schedule name.
	 */
	$frequency = apply_filters( 'altis.analytics.export.cron.frequency', ALTIS_ANALYTICS_EXPORT_CRON_FREQUENCY );

	// Setup cron Schedule.
	if ( ! wp_next_scheduled( 'altis.analytics.export.cron' ) ) {
		wp_schedule_event( time(), $frequency, 'altis.analytics.export.cron' );
	}
}

/**
 * Add a ten minute cron job interval.
 *
 * @param array $schedules WP Cron intervals.
 *
 * @return array
 */
function setup_cron_interval( $schedules ) : array {

	return array_merge( $schedules, [
		ALTIS_ANALYTICS_EXPORT_CRON_FREQUENCY => [
			'interval' => ALTIS_ANALYTICS_EXPORT_CRON_FREQUENCY_INTERVAL,
		],
	] );
}

/**
 * Log an event
 *
 * @param string $message Log entry message.
 * @param int    $level   Log entry level.
 *
 * @return void
 */
function log( string $message, int $level = E_USER_NOTICE ) : void {

	trigger_error( $message, $level );

	/**
	 * Trigger custom handling of logs, eg: for external notifications.
	 *
	 * @param string $message Log message.
	 * @param int    $level   Log level, one of PHP error levels.
	 */
	do_action( 'altis.analytics.export.log', $message, $level );
}

/**
 * Cron job handlers.
 *
 * @return void
 */
function cron_handler() : void {

	// Check if anyone is listening.
	$has_handlers = has_action( 'altis.analytics.export.data.process' );
	if ( ! $has_handlers ) {
		// No takers ? go home early.
		return;
	}

	// Get an S3 client.
	$client = Analytics\get_s3_client( [
		'retries' => [
			'mode' => 'adaptive',
			'max_attempts' => 3,
		],
	] );

	if ( ! $client ) {
		return;
	}

	// Get the files to process.
	$data = get_analytics_data( $client );
	if ( ! isset( $data ) ) {
		return;
	}

	if ( empty( $data ) ) {
		log( 'Warning: Empty analytics data were found.', E_USER_WARNING );
		return;
	}

	$entries = substr_count( $data, "\n" );
	log( sprintf( 'Success: Found %d analytics events, delivering payload to subscribers..', $entries ) );

	/**
	 * Process analytics data exported from S3.
	 *
	 * @param string $data NDJSON data for analytics events since last job run.
	 */
	do_action( 'altis.analytics.export.data.process', $data );
}

/**
 * Get analytics data from S3 bucket.
 *
 * @param S3Client $client S3 client.
 *
 * @return string NDJSON string of analytics data.
 */
function get_analytics_data( S3Client $client ) : ? string {

	// Check the last processed file key.
	$last_processed_key = get_option( ALTIS_ANALYTICS_EXPORT_LAST_PROCESSED_KEY );

	/**
	 * Limit the query to X number of files, in case the last timestamp isn't found.
	 *
	 * @param int Number of files to limit the query to.
	 */
	$max_files = apply_filters( 'altis.analytics.export.max.files', 100 );

	/**
	 * Filter the analytics bucket ARN.
	 *
	 * @param string Analytics bucket ARN.
	 */
	$bucket_arn = apply_filters( 'altis.analytics.export.bucket.arn', ALTIS_ANALYTICS_PINPOINT_BUCKET_ARN );

	// Fetch first batch of items.
	try {
		$keys = [];

		$list_params = [
			'Bucket' => $bucket_arn,
			'MaxKeys' => $max_files,
		];

		if ( $last_processed_key ) {
			$list_params['StartAfter'] = $last_processed_key;
		}

		$result = $client->listObjectsV2( $list_params );

		// Store keys to delete.
		foreach ( $result['Contents'] as $item ) {
			// Check prefix matches a date.
			if ( ! preg_match( '#^(\d{4}/\d{2}/\d{2})#', $item['Key'], $date_match ) ) {
				continue;
			}

			$keys[] = [
				'Bucket' => $bucket_arn,
				'Key' => $item['Key'],
			];
		}

		// Nothing more to do if there's nothing to delete.
		if ( empty( $keys ) ) {
			log( 'Warning: No matching analytics data files were found unlike expected.', E_USER_WARNING );
			return null;
		}
	} catch ( \Exception $error ) {
		// Log the error.
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		log( 'Error: Could not fetch list of analytics data files. Got: ' . $error->getMessage(), E_USER_ERROR );
		return null;
	}

	$data = '';

	foreach ( $keys as $key ) {
		try {
			$result = $client->getObject( $key );
			$data .= $result['Body'];
			$last_processed_key = $key;
		} catch ( S3Exception $e ) {
			log( sprintf( 'Error: Could not fetch analytics data file: "%s", error: "%s".', $key, $e->getMessage() ), E_USER_ERROR );
		}
	}

	if ( $last_processed_key ) {
		update_option( ALTIS_ANALYTICS_EXPORT_LAST_PROCESSED_KEY, $last_processed_key );
	}

	return $data;
}
