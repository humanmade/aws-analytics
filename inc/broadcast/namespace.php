<?php
/**
 * Broadcast feature setup.
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Broadcast;

use WP_Block_Editor_Context;

const POST_TYPE = 'broadcast';

/**
 * Feature setup code.
 *
 * @return void
 */
function setup() : void {
	add_action( 'init', __NAMESPACE__ . '\\register_broadcast_post_type' );
	add_filter( 'allowed_block_types_all', __NAMESPACE__ . '\\broadcast_allowed_block_types', 10, 2 );
}

/**
 * Register Broadcast Zone post type.
 *
 * @return void
 */
function register_broadcast_post_type() : void {
	register_extended_post_type(
		POST_TYPE,
		[
			'public' => false,
			'show_ui' => true,
			'dashboard_glance' => false,
			'block_editor' => false,
			'supports' => [
				'title',
				'author',
			],
			'description' => __( 'Broadcast your blocks to a larger audience.', 'altis' ),
			'menu_position' => 23,
			'show_in_rest' => true,
			'show_in_menu' => 'index.php',
			'rest_base' => 'broadcasts',
			'rest_controller_class' => __NAMESPACE__ . '\\Posts_Controller',
			'labels' => [
				'name' => __( 'Broadcasts', 'altis' ),
				'all_items' => __( 'Broadcasts', 'altis' ),
			],
		],
		[
			'singular' => __( 'Broadcast', 'altis' ),
			'plural' => __( 'Broadcasts', 'altis' ),
		]
	);
}

/**
 * Restrict block types to be used in Broadcast Zone posts.
 *
 * @param bool|string[] $allowed_block_types Allowed block types.
 * @param WP_Block_Editor_Context $editor_context Editor context.
 *
 * @return bool|string[] Allowed block types.
 */
function broadcast_allowed_block_types( $allowed_block_types, WP_Block_Editor_Context $editor_context ) {
	if ( $editor_context->post->post_type !== POST_TYPE ) {
		return $allowed_block_types;
	}

	$allowed_block_types = [
		'core/block',
		'xb',
	];

	return $allowed_block_types;
}
