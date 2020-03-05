<?php
/**
 * Audience REST API.
 *
 * @package altis-analytics
 */

namespace Altis\Analytics\Audiences\REST_API;

use const Altis\Analytics\Audiences\POST_TYPE;
use function Altis\Analytics\Utils\milliseconds;
use function Altis\Analytics\Utils\query;
use WP_Error;
use WP_Post;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

function setup() {
	add_action( 'rest_api_init', __NAMESPACE__ . '\\init' );
}

/**
 * Register audience API endpoints.
 */
function init() {
	// Fetch data for available fields and possible values.
	register_rest_route( 'analytics/v1', 'audiences/fields', [
		'methods' => WP_REST_Server::READABLE,
		'callback' => 'Altis\\Analytics\\Audiences\\get_field_data',
		'permissions_callback' => __NAMESPACE__ . '\\permissions',
		'schema' => [
			'type' => 'array',
			'items' => [
				'type' => 'object',
				'properties' => [
					'name' => [
						'type' => 'string',
						'required' => true,
					],
					'label' => [
						'type' => 'string',
						'required' => true,
					],
					'data' => [
						'type' => 'array',
						'items' => [
							'type' => 'object',
							'properties' => [
								'value' => [ 'type' => 'string' ],
								'count' => [ 'type' => 'number' ],
							],
						],
					],
					'stats' => [
						'type' => 'object',
						'properties' => [
							'count' => [ 'type' => 'number' ],
							'min' => [ 'type' => 'number' ],
							'max' => [ 'type' => 'number' ],
							'avg' => [ 'type' => 'number' ],
							'sum' => [ 'type' => 'number' ],
						],
					],
				],
			],
		],
	] );

	// Fetch an audience size estimate.
	register_rest_route( 'analytics/v1', 'audiences/estimate', [
		'methods' => WP_REST_Server::READABLE,
		'callback' => __NAMESPACE__ . '\\get_estimate',
		'permissions_callback' => __NAMESPACE__ . '\\permissions',
		'schema' => [
			'type' => 'object',
			// TODO: outline the estimate data shape
		],
		'args' => [
			'audience' => [
				'validate_callback' => function ( $param ) {
					$audience = json_decode( urldecode( $param ) );

					if ( json_last_error() ) {
						return new WP_Error( 'altis_audience_estimate_json_invalid', json_last_error_msg() );
					}

					// TODO: validate audience JSON.
					if ( ! isset( $audience['include'] ) ) {

					}

					if ( ! isset( $audience['groups'] ) ) {

					}

					return true;
				},
				'sanitize_callback' => function ( $param ) {
					$audience = json_decode( urldecode( $param ) );

					if ( json_last_error() ) {
						return new WP_Error( 'altis_audience_estimate_json_invalid', json_last_error_msg() );
					}

					return $audience;
				},
			],
		],
	] );

	// Handle the audience configuration data retrieval and saving via the REST API.
	register_rest_field( POST_TYPE, 'audience', [
		'get_callback' => __NAMESPACE__ . '\\get_audience',
		'update_callback' => __NAMESPACE__ . '\\update_audience',
		'schema' => [
			'type'  => 'object',
			'properties' => [
				'include' => [
					'type' => 'string',
					'enum' => [ 'any', 'all', 'none' ],
				],
				'groups' => [
					'type' => 'array',
					'items' => [
						'type' => 'object',
						'properties' => [
							'include' => [
								'type' => 'string',
								'enum' => [ 'any', 'all', 'none' ],
							],
							'rules' => [
								'type' => 'array',
								'items' => [
									'type' => 'object',
									'properties' => [
										'field' => [
											'type' => 'string',
										],
										'operator' => [
											'type' => 'string',
											'enum' => [ '=', '!=', '*=', '!*', 'gte', 'lte', 'gt', 'lt' ],
										],
										'value' => [
											'type' => [ 'string', 'number' ],
										],
									],
								],
							],
						],
					],
				],
			],
		],
	] );
}

/**
 * Undocumented function
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response
 */
function get_estimate( WP_REST_Request $request ) : WP_REST_Response {
	$audience = $request->get_param( 'audience' );

	$query = [
		'query' => [
			'bool' => [
				'filter' => [
					// Set current site.
					[ 'term' => [ 'attributes.blogId.keyword' => get_current_blog_id() ] ],
					// Last 7 days.
					[ 'range' => [ 'gte' => milliseconds() - ( 7 * 24 * 60 * 60 * 1000 ) ] ],
				],
			],
		],
		'aggs' => [
			'estimate' => [ 'cardinality' => [ 'field' => 'endpoint.User.UserId.keyword' ] ],
			'histogram' => [
				'histogram' => [
					'field' => 'event_timestamp',
					'interval' => 60 * 60 * 1000,
				],
			],
		],
		'size' => 0,
		'sort' => [ 'event_timestamp' => 'desc' ],
	];

	// TODO: parse out audience data.

	// TODO: caching.

	$result = query( $query );

	return rest_ensure_response( $result );
}

/**
 * Get the audience configuration data.
 *
 * @param WP_Post|array $post
 * @return WP_REST_Response
 */
function get_audience( array $post ) : array {

	return [];
}

/**
 * Update audience configuration data.
 *
 * @param array $value
 * @param WP_Post $post
 * @return void
 */
function update_audience( $value, WP_Post $post ) {

}

/**
 * Check user can edit audience posts.
 *
 * @return bool
 */
function permissions() : bool {
	return current_user_can( 'edit_audience' );
}
