<?php
/**
 * Audience REST API.
 *
 * @package altis-analytics
 */

namespace Altis\Analytics\Audiences\REST_API;

use const Altis\Analytics\Audiences\POST_TYPE;
use function Altis\Analytics\Audiences\get_estimate;
use WP_Error;
use WP_Post;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

/**
 * Hooks up the audience REST API endpoints.
 */
function setup() {
	add_action( 'rest_api_init', __NAMESPACE__ . '\\init' );
}

/**
 * Register audience API endpoints.
 */
function init() {
	// Fetch data for available fields and possible values.
	register_rest_route( 'analytics/v1', 'audiences/fields', [
		[
			'methods' => WP_REST_Server::READABLE,
			'callback' => 'Altis\\Analytics\\Audiences\\get_field_data',
			'permissions_callback' => __NAMESPACE__ . '\\permissions',
		],
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
					'type' => [
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
		[
			'methods' => WP_REST_Server::READABLE,
			'callback' => function ( WP_REST_Request $request ) : WP_REST_Response {
				$audience = $request->get_param( 'audience' );
				$estimate = get_estimate( $audience );
				return rest_ensure_response( $estimate );
			},
			'permissions_callback' => __NAMESPACE__ . '\\permissions',
			'args' => [
				'audience' => [
					'description' => __( 'A URL encoded audience configuration JSON string', 'altis-analytics' ),
					'required' => true,
					'type' => 'string',
					'validate_callback' => function ( $param ) {
						$audience = json_decode( urldecode( $param ), true );

						if ( json_last_error() !== JSON_ERROR_NONE ) {
							return new WP_Error(
								'altis_audience_estimate_json_invalid',
								'Could not decode JSON: ' . json_last_error_msg()
							);
						}

						// Validate against the audience schema after decoding.
						return rest_validate_value_from_schema( $audience, get_audience_schema(), 'audience' );
					},
					'sanitize_callback' => function ( $param ) {
						$audience = json_decode( urldecode( $param ), true );

						if ( json_last_error() !== JSON_ERROR_NONE ) {
							return new WP_Error(
								'altis_audience_estimate_json_invalid',
								'Could not decode JSON: ' . json_last_error_msg()
							);
						}

						return $audience;
					},
				],
			],
		],
		'schema' => [
			'type' => 'object',
			'properties' => [
				'count' => [ 'type' => 'number' ],
				'total' => [ 'type' => 'number' ],
				'histogram' => [
					'type' => 'array',
					'items' => [
						'type' => 'object',
						'properties' => [
							'index' => [ 'type' => 'string' ],
							'count' => [ 'type' => 'number' ],
						],
					],
				],
			],
		],
	] );

	// Handle the audience configuration data retrieval and saving via the REST API.
	register_rest_field( POST_TYPE, 'audience', [
		'get_callback' => function ( array $post ) {
			return get_estimate( $post['id'] );
		},
		'update_callback' => function ( $value, WP_Post $post ) {
			return update_post_meta( $post->ID, 'audience', $value );
		},
		'schema' => get_audience_schema(),
	] );
}

/**
 * Returns the audience configuration JSON schema.
 *
 * @return array
 */
function get_audience_schema() : array {
	return [
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
										'enum' => [ '=', '!=', '*=', '!*', '^=', 'gte', 'lte', 'gt', 'lt' ],
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
	];
}

/**
 * Check user can edit audience posts.
 *
 * @return bool
 */
function permissions() : bool {
	return current_user_can( 'edit_audience' );
}
