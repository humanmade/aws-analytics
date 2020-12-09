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

use function HM\GTM\flatten_array as GTMFlatten_array;

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
			'export/(?P<date>\d{4}-\d{2}-\d{2})',
			[
				'args'   => [
					'date' => [
						'description' => 'Day to retrieve the analytics data from.',
						'type' => 'date',
						'sanitize_callback' => 'sanitize_text_field',
					],
					'page' => [
						'description'       => 'Current page',
						'type'              => 'integer',
						'default'           => 1,
						'sanitize_callback' => 'absint',
						'validate_callback' => 'rest_validate_request_arg',
						'minimum'           => 1,
					],
					'per_page' => [
						'description' => 'How many records to return per page.',
						'type' => 'number',
						'sanitize_callback' => 'absint',
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
	 * Undocumented function
	 *
	 * @param bool $served Whether the request has already been served.
	 * @param WP_HTTP_ResponseInterface $result Result to send to the client. Usually a WP_REST_Response.
	 * @param WP_REST_Request $request Request used to generate the response.
	 * @param WP_REST_Server $server Server instance.
	 * @return true
	 */
	public function pre_serve_request( bool $served, $result, WP_REST_Request $request, WP_REST_Server $server ) : bool {
		$params = $request->get_params();

		if ( ! preg_match( '#/analytics/v1/export/(?P<date>\d{4}-\d{2}-\d{2})#', $request->get_route() ) || 'GET' !== $request->get_method() ) {
			return $served;
		}

		if ( ! isset( $params['format'] ) || 'csv' !== $params['format'] ) {
			return $served;
		}

		// Get the response data.
		$data = $server->response_to_data( $result, false );

		// Convert to a CSV string.
		$result = $this->to_csv( $data );

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
	 * Recursively convert array to CSV string.
	 *
	 * @param array $data The data to output as CSV.
	 * @return string|null
	 */
	private function to_csv( array $data ) : ?string {
		if ( empty( $data ) ) {
			return null;
		}

		// Collect column headers.
		$columns = [];

		// Flatten rows and collect column names.
		$data = array_map( function ( $row ) use ( &$columns ) {
			$flattened_data = $this->flatten_array( $row );

			$new_columns = array_keys( $flattened_data );
			$columns = array_merge( $new_columns, $columns );
			$columns = array_unique( $columns );

			return $flattened_data;
		}, $data );

		// Convert to CSV string.
		$data = array_reduce( $data, function ( $carry, $row ) use ( $columns ) {
			// Ensure all rows have the same columns.
			foreach ( $columns as $column ) {
				$carry .= ( $row[ $column ] ?? '' ) . ',';
			}

			return trim( $carry, ',' ) . "\n";
		}, '' );

		// Add header row.
		$columns = implode( ',', $columns ) . "\n";

		return $columns . $data;
	}

	/**
	 * Escape values for CSV.
	 *
	 * Ensure commas are preserved and quotes are encoded.
	 *
	 * @param mixed $value The value to escape.
	 * @return mixed
	 */
	private function esc_csv( $value ) {
		if ( is_string( $value ) && strpos( $value, ',' ) !== false ) {
			if ( strpos( $value, '"' ) !== false ) {
				$value = str_replace( '"', '""', $value );
			}
			$value = sprintf( '"%s"', $value );
		}

		return $value;
	}

	/**
	 * Flattens an array recursively and sets the keys for nested values
	 * as a dot separated path.
	 *
	 * @param array $data The array to flatten.
	 * @param string $prefix The current key prefix.
	 * @return array
	 */
	private function flatten_array( array $data, string $prefix = '' ) : array {
		$flattened = [];
		$prefix = ! empty( $prefix ) ? "{$prefix}." : '';

		foreach ( $data as $key => $value ) {
			if ( is_array( $value ) ) {
				$flattened = array_merge( $flattened, $this->flatten_array( $value, "{$prefix}{$key}" ) );
			} else {
				$flattened[ "{$prefix}{$key}" ] = $this->esc_csv( $value );
			}
		}

		return $flattened;
	}

	/**
	 * Lock down the endpoint to only allow administrator users authenticated via application password to access the
	 * date.
	 *
	 * @return bool True if the request has read access for the item, otherwise false.
	 */
	public function get_item_permissions_check() {
		return current_user_can( 'manage_options' );
	}
}
