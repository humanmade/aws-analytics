<?php
/**
 * Broadcast feature setup.
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Broadcast;

use Altis\Accelerate\Admin;
use Altis\Analytics\API;
use Altis\Analytics\Utils;
use WP_Block_Editor_Context;
use WP_Post;
use WP_Post_Type;

const POST_TYPE = 'broadcast';

/**
 * Feature setup code.
 *
 * @return void
 */
function setup() : void {
	add_action( 'init', __NAMESPACE__ . '\\register_broadcast_post_type' );
	add_action( 'rest_api_init', __NAMESPACE__ . '\\register_rest_fields' );
	add_filter( 'allowed_block_types_all', __NAMESPACE__ . '\\broadcast_allowed_block_types', 10, 2 );

	add_action( 'load-edit.php', __NAMESPACE__ . '\\load_broadcast_manager' );
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
 * Register REST fields for Broadcast type.
 *
 * @return void
 */
function register_rest_fields() : void {

	// Handle the nested blocks data retrieval and saving via the REST API.
	register_rest_field( POST_TYPE, 'blocks', [
		'get_callback' => function ( array $post ) : array {
			$ids = get_post_meta( $post['id'], 'blocks' ) ?: [];
			return $ids;
		},
		'update_callback' => function ( $value, WP_Post $post ) {
			$prev = array_map( 'absint', get_post_meta( $post->ID, 'blocks' ) ) ?: [];
			$value = array_map( 'absint', $value );

			$to_delete = array_diff( $prev, $value );
			$to_add = array_filter( array_diff( $value, $prev ) );

			foreach ( $to_delete as $block_id ) {
				delete_post_meta( $post->ID, 'blocks', $block_id );
			}

			foreach ( $to_add as $block_id ) {
				add_post_meta( $post->ID, 'blocks', $block_id );
			}
		},
		'schema' => [
			'type' => 'array',
			'items' => [
				'type' => 'integer',
			],
			'default' => [],
		],
	] );

	// Handle the nested blocks data retrieval and saving via the REST API.
	register_rest_field( POST_TYPE, 'thumbnails', [
		'get_callback' => function ( array $post ) : array {
			$block_ids = get_post_meta( $post['id'], 'blocks' ) ?: [];
			$thumbnails = array_map( function( int $block_post_id ) : string {
				return API\get_block_preview_thumbnail( $block_post_id );
			}, $block_ids );

			return $thumbnails;
		},
		'schema' => [
			'type' => 'array',
			'items' => [
				'type' => 'string',
			],
			'default' => [],
		],
	] );
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

/**
 * Replace the site dashboard with the Accelerate dashboard.
 *
 * @return void
 */
function load_broadcast_manager() {
	global $title;

	// phpcs:disable HM.Security.NonceVerification
	if (
		! isset( $_REQUEST['post_type'] )
		|| $_REQUEST['post_type'] !== 'broadcast'
		|| ! current_user_can( 'edit_posts' )
	) {
		return;
	}

	Admin\add_notices_wrapper();

	Utils\enqueue_assets( 'accelerate' );

	add_filter( 'screen_options_show_screen', '__return_false' );

	// Set admin page title.
	$title = __( 'Accelerate - Broadcast Manager', 'altis' );
	$user = wp_get_current_user();

	$post_types = [ get_post_type_object( 'broadcast' ) ];

	$post_types = array_map( function ( WP_Post_Type $post_type ) {
		return [
			'name' => $post_type->name,
			'label' => $post_type->labels->name,
			'singular_label' => $post_type->labels->singular_name,
		];
	}, $post_types );

	wp_localize_script( 'altis-analytics-accelerate', 'AltisAccelerateDashboardData', [
		'api_namespace' => API\API_NAMESPACE,
		'version' => Utils\get_plugin_version(),
		'user' => [
			'id' => get_current_user_id(),
			'name' => $user->get( 'display_name' ),
		],
		'post_types' => array_values( $post_types ),
		'page' => 'broadcast',
		'id' => intval( $_REQUEST['id'] ?? 0 ) ?: null,
	] );

	Admin\render_page();
	exit;
	// phpcs:enable HM.Security.NonceVerification
}
