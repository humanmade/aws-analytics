<?php
/**
 * Blocks REST API.
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Blocks\REST_API;

use Altis\Analytics\Audiences;
use Altis\Analytics\Blocks;
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
 * Register REST API endpoints for Experience Blocks.
 *
 * @return void
 */
function init() : void {
	// Experience blocks views endpoint.
	register_rest_route( 'analytics/v1', 'xbs/(?P<id>[a-z0-9-]+)/views', [
		[
			'methods' => WP_REST_Server::READABLE,
			'callback' => __NAMESPACE__ . '\\handle_views_request',
			'permission_callback' => __NAMESPACE__ . '\\check_views_permission',
			'args' => [
				'id' => [
					'description' => __( 'The experience block client ID', 'altis-analytics' ),
					'required' => true,
					'type' => 'string',
					'validate_callback' => __NAMESPACE__ . '\\validate_id',
					'sanitize_callback' => __NAMESPACE__ . '\\sanitize_id',
				],
				'post_id' => [
					'description' => __( 'An optional post ID to filter by.', 'altis-analytics' ),
					'type' => 'number',
				],
				'days' => [
					'description' => __( 'Number of days worth of data to get.', 'altis-analytics' ),
					'type' => 'string',
					'default' => 'P7D',
				],
				'offset' => [
					'description' => __( 'Number of days to offset data by. For example 3 means get data from before 3 days ago.', 'altis-analytics' ),
					'type' => 'string',
					'default' => 'P0D',
				],
				'start' => [
					'description' => __( 'Start date', 'altis-analytics' ),
					'type' => 'string',
					'required' => true,
				],
				'end' => [
					'description' => __( 'End date', 'altis-analytics' ),
					'type' => 'string',
					'required' => true,
				],
			],
		],
		'schema' => [
			'type' => 'object',
			'properties' => [
				'start' => [
					'description' => __( 'Start date', 'altis-analytics' ),
					'type' => 'string',
				],
				'end' => [
					'description' => __( 'End date', 'altis-analytics' ),
					'type' => 'string',
				],
				'loads' => [ 'type' => 'number' ],
				'views' => [ 'type' => 'number' ],
				'conversions' => [ 'type' => 'number' ],
				'variants' => [
					'type' => 'array',
					'items' => get_variants_data_schema(),
				],
				'posts' => [
					'type' => 'array',
					'items' => [
						'type' => 'object',
						'properties' => array_merge(
							get_variants_data_schema()['properties'],
							[ 'variants' => get_variants_data_schema() ]
						),
					],
				],
				'postId' => [ 'type' => 'number' ],
			],
		],
	] );
}

/**
 * Get the schema for XB analytics variant metrics.
 *
 * @return array
 */
function get_variants_data_schema() : array {
	return [
		'type' => 'object',
		'properties' => [
			'id' => [
				'type' => 'number',
			],
			'loads' => [
				'type' => 'number',
			],
			'views' => [
				'type' => 'number',
			],
			'conversions' => [
				'type' => 'number',
			],
			'unique' => [
				'type' => 'object',
				'properties' => [
					'loads' => [
						'type' => 'number',
					],
					'views' => [
						'type' => 'number',
					],
					'conversions' => [
						'type' => 'number',
					],
				],
			],
		],
	];
}

/**
 * Validate Experience Block ID.
 *
 * @param string $param The Experience Block ID.
 * @return bool
 */
function validate_id( $param ) : bool {
	return (bool) preg_match( '/[a-z0-9-]+/', $param );
}

/**
 * Sanitize Experience Block ID.
 *
 * @param string $param The Experience Block ID.
 * @return string
 */
function sanitize_id( $param ) : string {
	return preg_replace( '/[^a-z0-9-]+/', '', $param );
}

/**
 * Check current user can view XB analytics data.
 *
 * @return boolean
 */
function check_views_permission() : bool {
	$type = get_post_type_object( Audiences\POST_TYPE );
	return current_user_can( $type->cap->read );
}

/**
 * Retrieve the Experience Block views data.
 *
 * @param WP_REST_Request $request The REST request object.
 * @return WP_REST_Response
 */
function handle_views_request( WP_REST_Request $request ) : WP_REST_Response {
	$block_id = $request->get_param( 'id' );
	$post_id = $request->get_param( 'post_id' ) ?? null;
	$days = $request->get_param( 'days' );
	$offset = $request->get_param( 'offset' );
	$start = $request->get_param( 'start' );
	$end = $request->get_param( 'end' );
	$views = Blocks\get_views( $block_id, [
		'post_id' => $post_id,
		'days' => $days,
		'offset' => $offset,
		'start' => $start,
		'end' => $end,
	] );
	return rest_ensure_response( $views );
}
