<?php
/**
 * REST API endpoint to retrieve all the Altis Analytics data for a particular date.
 *
 * phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
 */

namespace Altis\Analytics\Export;

use Altis\Analytics\Utils;
use DateInterval;
use DateTime;
use Exception;
use WP_Error;
use WP_REST_Request;
use WP_REST_Server;

/**
 * Class Data_Endpoint
 *
 * @package RN\Altis_Analytics_Customisations
 */
class Endpoint {
	/**
	 * Add hooks.
	 */
	public function bootstrap() : void {
		add_action( 'rest_api_init', [ $this, 'register_routes' ] );
	}

	/**
	 * Registers the route.
	 */
	public function register_routes() : void {
		register_rest_route(
			'accelerate/v1',
			'events/(?P<date>\d{4}-\d{2}-\d{2})',
			[
				'args'   => [
					'date' => [
						'description' => 'Day to retrieve the analytics data from.',
						'type' => 'string',
						'required' => true,
					],
					'chunk_size' => [
						'description' => 'How many records to return per chunk.',
						'type' => 'number',
						'default' => 3000,
					],
					'format' => [
						'description' => 'The data format to get results in, one of json or csv.',
						'type' => 'string',
						'enum' => [ 'json', 'csv' ],
						'default' => 'json',
					],
				],
				[
					'methods' => WP_REST_Server::READABLE,
					'callback' => [ $this, 'get_items' ],
					'permission_callback' => [ $this, 'get_item_permissions_check' ],
				],
			]
		);
	}

	/**
	 * Return the items for this endpoint.
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 *
	 * @return WP_REST_Response|WP_Error Response object.
	 */
	public function get_items( WP_REST_Request $request ) {
		global $wpdb;

		$dates = $this->get_date_query_arguments( $request->get_param( 'date' ) );

		if ( is_wp_error( $dates ) ) {
			return $dates;
		}

		// Raise memory and timeout limit for export request.
		wp_raise_memory_limit( 'accelerate' );
		set_time_limit( 0 );

		// Manually stream the response, as there is likely too much to hold in memory at once.
		header( 'X-Accel-Buffering: no' );

		// Check accept header for format.
		$format = $request->get_param( 'format' );
		if ( ! empty( $request->get_header( 'accept' ) ) ) {
			$parsed_header = Utils\parse_accept_header( $request->get_header( 'accept' ) );
			$accept_type = Utils\find_best_accept_header_match( $parsed_header, [
				'application/json',
				'text/csv',
			] );
			$format = $accept_type === 'text/csv' ? 'csv' : $request->get_param( 'format' );
		}

		// Set content type header.
		if ( $format === 'json' ) {
			header( 'Content-Type: application/json; charset=' . get_option( 'blog_charset' ), true );
		} else {
			header( 'Content-Type: text/csv; charset=' . get_option( 'blog_charset' ), true );
		}

		// Track params for interpolating.
		$query_params = [];

		// Default part of the query to get all events for the current site.
		$query_where = "blog_id = {blog_id:String} AND event_timestamp >= toDateTime64({start:String},3) AND event_timestamp < toDateTime64({end:String},3)";
		$query_params['param_blog_id'] = get_current_blog_id();
		$query_params['param_start'] = $dates['start'];
		$query_params['param_end'] = $dates['end'];

		// The first query returns just the total number of items for reporting purposes.
		$total = Utils\clickhouse_query( "SELECT count() as total FROM analytics WHERE {$query_where}", $query_params );
		$total = intval( $total->total ?? 0 );

		// Set total found results header.
		header( sprintf( 'X-WP-Total: %d', $total ) );

		// Determine the chunk size.
		$chunk_size = $request->get_param( 'chunk_size' ); // Should not be more than 10000.
		$chunk_size = min( 10000, max( 1, $chunk_size ) );

		// Determine number of pages.
		$total_pages = (int) ceil( $total / $chunk_size );

		// Begin output.
		if ( $format === 'json' ) {
			echo "[\n";
			flush();
		}

		// Page through the events for the desired day.
		for ( $page = 0; $page < $total_pages; $page++ ) {
			$query_format = '';
			if ( $format === 'csv' ) {
				$query_format = 'FORMAT CSV' . ( $page === 0 ? 'WithNames' : '' );
			}

			$results = Utils\clickhouse_query(
				"SELECT * FROM analytics WHERE {$query_where} LIMIT {limit:UInt64} OFFSET {offset:UInt64} {$query_format}",
				array_merge( $query_params, [
					'param_limit' => $chunk_size,
					'param_offset' => $chunk_size * $page,
				] ),
				'raw'
			);

			if ( is_wp_error( $results ) ) {
				trigger_error( 'Analytics export error: ' . $results->get_error_message(), E_USER_WARNING );
				continue;
			}

			if ( ! is_string( $results ) || empty( $results ) ) {
				break;
			}

			if ( $format === 'json' ) {
				$results = trim( str_replace( "\n", ",\n", $results ), "\n," );
				if ( ! empty( $results ) ) {
					// Add a comma in between result sets except for the last page.
					$results .= $page === $total_pages - 1 ? '' : ',';
				}
			}

			echo $results;
			flush();
		}

		// Close out the JSON array.
		if ( $format === 'json' ) {
			echo ']';
			flush();
		}

		exit;
	}

	/**
	 * Generate date arguments for the ElasticSearch query from the date argument passed through the REST API endpoint.
	 *
	 * @param string $date Date in YYYY-MM-DD format.
	 *
	 * @return int[]|WP_Error Array of datetime values in milliseconds, with a `start` and `end` key.
	 */
	private function get_date_query_arguments( string $date ) {
		try {
			$start_date = new DateTime( $date . 'T00:00:00' );
		} catch ( Exception $e ) {
			return new WP_Error(
				'invalid-date',
				'Could not get query arguments from date argument'
			);
		}

		return [
			'start' => $start_date->format( 'Y-m-d H:i:s' ),
			'end' => $start_date->add( new DateInterval( 'P1D' ) )->format( 'Y-m-d H:i:s' ),
		];
	}

	/**
	 * Lock down the endpoint to only allow administrator users authenticated via application password to access the
	 * date.
	 *
	 * @return bool True if the request has read access for the item, otherwise false.
	 */
	public function get_item_permissions_check() {
		/**
		 * Filter the require capability for exporting analytics events.
		 *
		 * @param string $capability A capability belonging to the authenticated user. Defaults to 'manage_options'.
		 */
		$capability = (string) apply_filters( 'altis.analytics.export_events_capability', 'manage_options' );

		return current_user_can( $capability );
	}
}
