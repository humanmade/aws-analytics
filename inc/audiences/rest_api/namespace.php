<?php
/**
 * Audience REST API.
 *
 * @package altis-analytics
 */

namespace Altis\Analytics\Audiences\REST_API;

use Altis\Analytics\Audiences;
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
			'permission_callback' => __NAMESPACE__ . '\\check_edit_permission',
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
					'description' => [
						'type' => 'string',
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
			'callback' => __NAMESPACE__ . '\\handle_estimate_request',
			'permission_callback' => __NAMESPACE__ . '\\check_edit_permission',
			'args' => [
				'audience' => [
					'description' => __( 'A URL encoded audience configuration JSON string', 'altis-analytics' ),
					'required' => true,
					'type' => 'string',
					'validate_callback' => __NAMESPACE__ . '\\validate_estimate_audience',
					'sanitize_callback' => __NAMESPACE__ . '\\sanitize_estimate_audience',
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
	register_rest_field( Audiences\POST_TYPE, 'audience', [
		'get_callback' => function ( array $post ) {
			return Audiences\get_audience( $post['id'] );
		},
		'update_callback' => function ( $value, WP_Post $post ) {
			return Audiences\save_audience( $post->ID, (array) $value );
		},
		'schema' => get_audience_schema(),
	] );
}

/**
 * Get the JSON schema for the rule object.
 *
 * @return array
 */
function get_rule_schema() : array {
	return [
		'type' => 'object',
		'properties' => [
			'field' => [
				'type' => 'string',
			],
			'operator' => [
				'type' => 'string',
				'enum' => Audiences\COMPARISON_OPERATORS,
			],
			'value' => [
				'type' => [
					'string',
					'number',
				],
			],
		],
	];
}

/**
 * Get the JSON schema for the group object.
 *
 * @return array
 */
function get_group_schema() : array {
	return [
		'type' => 'object',
		'properties' => [
			'include' => [
				'type' => 'string',
				'enum' => [
					'any',
					'all',
					'none',
				],
			],
			'rules' => [
				'type' => 'array',
				'items' => get_rule_schema(),
			],
		],
	];
}

/**
 * Get the JSON schema for the audience configuration object.
 *
 * @return array
 */
function get_audience_schema() : array {
	return [
		'type' => 'object',
		'properties' => [
			'include' => [
				'type' => 'string',
				'enum' => [
					'any',
					'all',
					'none',
				],
			],
			'groups' => [
				'type' => 'array',
				'items' => get_group_schema(),
			],
		],
	];
}

/**
 * Retrieve the estimate response.
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response
 */
function handle_estimate_request( WP_REST_Request $request ) : WP_REST_Response {
	$audience = $request->get_param( 'audience' );
	$estimate = Audiences\get_estimate( $audience );
	return rest_ensure_response( $estimate );
}

/**
 * Validate the estimate audience configuration parameter.
 *
 * @param string $param The audience configuration JSON string.
 * @return bool
 */
function validate_estimate_audience( $param ) {
	$audience = json_decode( $param, true );

	if ( json_last_error() !== JSON_ERROR_NONE ) {
		return new WP_Error(
			'altis_audience_estimate_json_invalid',
			sprintf(
				/* translators: %s: JSON error message */
				__( 'Could not decode JSON: %s', 'altis-analytics' ),
				json_last_error_msg()
			)
		);
	}

	// Validate against the audience schema after decoding.
	return rest_validate_value_from_schema( $audience, get_audience_schema(), 'audience' );
}

/**
 * Sanitize the estimate audience value.
 *
 * @param string $param The audience configuration JSON string.
 * @return array|WP_Error
 */
function sanitize_estimate_audience( $param ) {
	$audience = json_decode( $param, true );

	if ( json_last_error() !== JSON_ERROR_NONE ) {
		return new WP_Error(
			'altis_audience_estimate_json_invalid',
			sprintf(
				/* translators: %s: JSON error message */
				__( 'Could not decode JSON: %s', 'altis-analytics' ),
				json_last_error_msg()
			)
		);
	}

	return $audience;
}

/**
 * Check user can edit audience posts.
 *
 * @return bool
 */
function check_edit_permission() : bool {
	$type = get_post_type_object( Audiences\POST_TYPE );
	return current_user_can( $type->cap->edit_posts );
}
