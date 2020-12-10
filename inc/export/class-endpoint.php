<?php
/**
 * REST API endpoint to retrieve all the Altis Analytics data for a particular date.
 *
 * Displays 5000 items at once, after that there's pagination.
 */

declare( strict_types=1 );

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
		add_filter( 'rest_pre_serve_request', [ $this, 'pre_serve_request' ], 10, 4 );
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
						'type' => 'date',
					],
					'page' => [
						'description'       => 'Current page',
						'type'              => 'number',
						'default'           => 1,
						'minimum'           => 1,
					],
					'per_page' => [
						'description' => 'How many records to return per page.',
						'type' => 'number',
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
		$dates = $this->get_date_query_arguments( $request->get_params()['date'] );

		if ( is_wp_error( $dates ) ) {
			return $dates;
		}

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

		// The first query returns just the total number of items
		// so the results can be sliced later.
		$total_results = Utils\query( [
			'query' => $main_query,
			'size' => 0,
		] );

		// Now get the paginated results.
		$per_page = $request->get_param( 'per_page' ) ?? 5000; // Should not be more than 10000.
		$per_page = max( 1, $per_page );
        $page = (int) $request->get_params()['page'] ?? 1;
        $total = $total_results['hits']['total']['value'] ?? $total_results['hits']['total']; // ES 7 compat.
		$max = (int) ceil( $total / $per_page );

		if ( $max === 0 ) {
			return rest_ensure_response( [] );
		}

		// Elasticsearch slices need at least 2 pages.
		$total_pages = max( $max, 2 );

		// This is the slice ID (similar to a current page).
		$id = $page - 1;

		if ( $id >= $total_pages ) {
			return rest_ensure_response( [] );
		}

		$query = [
			'query' => $main_query,
			'slice' => [
				'id' => $id,
				'max' => $total_pages,
			],
			// Elasticsearch needs this even if slice is set. Let's give it a higher number than per_page.
			'size' => max( 10000, $per_page + 1000 ),
		];

		// Allow 3 minutes per page of data.
		$cache_results_minutes = $total_pages * 3;

		$results = Utils\query( $query, [ 'scroll' => $cache_results_minutes . 'm' ] );

		if ( ! is_array( $results ) ) {
			return rest_ensure_response( [] );
        }

        // Extract the event source data only.
        $hits = wp_list_pluck( $results['hits']['hits'], '_source' );

		$response = rest_ensure_response( $hits );

		$response->header( 'X-WP-Total', (int) $total );
		$response->header( 'X-WP-TotalPages', $total_pages );

		return $response;
	}

	/**
	 * Filter before the request is served to deliver CSV if requested.
	 *
	 * @param bool $served Whether the request has already been served.
	 * @param WP_HTTP_ResponseInterface $result Result to send to the client. Usually a WP_REST_Response.
	 * @param WP_REST_Request $request Request used to generate the response.
	 * @param WP_REST_Server $server Server instance.
	 * @return true
	 */
	public function pre_serve_request( bool $served, $result, WP_REST_Request $request, WP_REST_Server $server ) : bool {
		$params = $request->get_params();

		if ( ! preg_match( '#/analytics/v1/events/(?P<date>\d{4}-\d{2}-\d{2})#', $request->get_route() ) || 'GET' !== $request->get_method() ) {
			return $served;
		}

		// Check accept header.
		$parsed_header = Utils\parse_accept_header( $request->get_header( 'accept' ) );
		$accept_type = Utils\find_best_accept_header_match( $parsed_header, [
			'application/json',
			'text/csv',
		] );

		if ( $accept_type !== 'text/csv' && ( ! isset( $params['format'] ) || 'csv' !== $params['format'] ) ) {
			return $served;
		}

		// Get the response data.
		$data = $server->response_to_data( $result, false );

		// Convert to a CSV string.
		$result = Utils\array_to_csv( $data );

		// Bail if there's no data.
		if ( ! $result ) {
			status_header( 501 );
			return get_status_header_desc( 501 );
		}

		if ( ! headers_sent() ) {
			$server->send_header( 'Content-Type', 'text/csv; charset=' . get_option( 'blog_charset' ) );
		}

		echo $result;

		return true;
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
