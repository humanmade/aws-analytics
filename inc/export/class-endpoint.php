<?php
/**
 * REST API endpoint to retrieve all the Altis Analytics data for a particular date.
 */

namespace Altis\Analytics\Export;

use Altis\Analytics\Utils;
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
			'analytics/v1',
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
		$dates = $this->get_date_query_arguments( $request->get_param( 'date' ) );

		if ( is_wp_error( $dates ) ) {
			return $dates;
		}

		// Raise memory and timeout limit for export request.
		wp_raise_memory_limit( 'analytics' );
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

		// Default part of the query to get all events for the current site.
		$main_query = [
			'bool' => [
				'filter' => [
					[
						'term' => [
							'attributes.blogId.keyword' => get_current_blog_id(),
						],
					],
					[
						'range' => [
							'event_timestamp' => [
								'gte' => $dates['start'],
								'lt' => $dates['end'],
							],
						],
					],
				],
			],
		];

		$total_query = [
			'query' => $main_query,
			'size' => 0,
		];

		// Ensure we're tracking the total hits for ES 7.3+ so our slices aren't too large.
		if ( version_compare( Utils\get_elasticsearch_version(), '7.2', '>' ) ) {
			$total_query['track_total_hits'] = true;
		}

		// The first query returns just the total number of items
		// so the results can be sliced later.
		$total_results = Utils\query( $total_query );
		$total = $total_results['hits']['total']['value'] ?? $total_results['hits']['total']; // ES 7 compat.

		// Set total found results header.
		header( sprintf( 'X-WP-Total: %d', $total ) );

		// Determine the chunk size.
		$chunk_size = $request->get_param( 'chunk_size' ); // Should not be more than 10000.
		$chunk_size = min( 9000, max( 1, $chunk_size ) );

		// Elasticsearch slices need at least 2 pages and no more than 1024 by default.
		$total_pages = (int) ceil( $total / $chunk_size );
		$total_pages = min( 1024, max( $total_pages, 2 ) );

		// Collect all the fields we'll need ahead of time for CSV output.
		$fields = [];

		// Begin output.
		if ( $format === 'json' ) {
			echo "[\n";
			flush();
		} else {
			// Field mapping include a type key before the property names.
			$filter_path = '-*.mappings.*.*keyword,-*.mappings.*._*,-*.mappings.*.*.*.*';
			if ( version_compare( Utils\get_elasticsearch_version(), '7', '>=' ) ) {
				$filter_path = '-*.mappings.*keyword,-*.mappings._*,-*.mappings.*.*.*';
			}

			// Fetch all available columns across all indices if we're sending a csv, we need these for the 1st line.
			$index_mappings = Utils\query( [], [
				'ignore_unavailable' => 'false',
				'include_defaults' => 'false',
				'filter_path' => $filter_path,
			], '_mapping/field/*', 'GET' );

			foreach ( $index_mappings as $mapping ) {
				// ES 6.x compatibility.
				if ( version_compare( Utils\get_elasticsearch_version(), '7', '<' ) ) {
					$fields = array_merge( $fields, array_keys( $mapping['mappings']['_doc'] ?? [] ) );
					$fields = array_merge( $fields, array_keys( $mapping['mappings']['record'] ?? [] ) );
				} else {
					$fields = array_merge( $fields, array_keys( $mapping['mappings'] ) );
				}

				$fields = array_unique( $fields );
			}

			sort( $fields );

			// Get PHP output handle.
			$handle = fopen( 'php://output', 'w' );

			// Write columns headings line.
			fputcsv( $handle, $fields ) . "\n";
			fflush( $handle );
		}

		// Track the scroll ID, default to _all.
		$scroll_ids = [];

		// Page through the events for the desired day.
		for ( $page = 0; $page < $total_pages; $page++ ) {
			$query = [
				'query' => $main_query,
				'slice' => [
					'id' => $page,
					'max' => $total_pages,
				],
				// Elasticsearch needs this even if slice is set, maximum value is 10000.
				// We give it a higher number than per_page so all results within the slice are returned.
				'size' => min( 10000, $chunk_size + 1000 ),
			];

			// Keep the scroll query alive for 1 minute per page of data.
			$results = Utils\query( $query, [ 'scroll' => $total_pages . 'm' ] );

			if ( ! is_array( $results ) ) {
				break;
			}

			// Get the scroll ID.
			if ( isset( $results['_scroll_id'] ) ) {
				$scroll_ids[] = $results['_scroll_id'];
			}

			// Extract the event source data only.
			$events = wp_list_pluck( $results['hits']['hits'], '_source' );

			if ( $format === 'json' ) {
				// phpcs:ignore HM.Security.EscapeOutput.OutputNotEscaped
				echo trim( wp_json_encode( $events, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ), '[]' ) . "\n";
				if ( ! empty( $events ) ) {
					// Add a comma in between result sets except for the last page.
					echo $page === $total_pages - 1 ? '' : ',';
				}
				flush();
			} else {
				foreach ( $events as $event ) {
					$event = Utils\flatten_array( $event );
					$row = [];
					foreach ( $fields as $field ) {
						$row[ $field ] = $event[ $field ] ?? null;
					}

					fputcsv( fopen( 'php://output', 'w' ), $row ) . "\n";
					fflush( $handle );
				}
			}
		}

		// Close out the JSON array.
		if ( $format === 'json' ) {
			echo ']';
			flush();
		}

		// Cleanup resource heavy scroll query.
		$this->clear_search_scroll( $scroll_ids );

		exit;
	}

	/**
	 * Removes any existing Elasticsearch search scrolls.
	 *
	 * @param array $scroll_ids A list of scroll IDs to be removed.
	 * @return void
	 */
	private function clear_search_scroll( array $scroll_ids ) {
		// Clear search scrolls.
		wp_remote_request( Utils\get_elasticsearch_url() . '/_search/scroll', [
			'method' => 'DELETE',
			'headers' => [
				'Content-Type' => 'application/json',
			],
			'body' => wp_json_encode( [
				'scroll_id' => $scroll_ids,
			] ),
		] );
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
			'start' => (int) ( $start_date->format( 'U' ) * 1000 ),
			'end' => ( (int) $start_date->format( 'U' ) + DAY_IN_SECONDS ) * 1000,
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
