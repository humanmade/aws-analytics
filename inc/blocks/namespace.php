<?php
/**
 * Experience Block functions.
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Blocks;

use Altis\Analytics\Utils;
use WP_Post;
use WP_Query;

const POST_TYPE = 'xb';

/**
 * Include and set up Experience Blocks.
 */
function setup() {
	require_once __DIR__ . '/personalization/register.php';
	require_once __DIR__ . '/personalization-variant/register.php';

	// Register blocks.
	Personalization\setup();
	Personalization_Variant\setup();

	// Set up the XB shadow post type.
	add_action( 'init', __NAMESPACE__ . '\\register_post_type' );
	add_action( 'save_post', __NAMESPACE__ . '\\on_save_post', 10, 3 );

	// Register experience block category.
	add_filter( 'block_categories', __NAMESPACE__ . '\\add_block_category', 9 );

	// Register API endpoints for getting XB analytics data.
	add_action( 'rest_api_init', __NAMESPACE__ . '\\rest_api_init' );

	// Register globally useful scripts.
	add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\\register_scripts', 1 );
	add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\\enqueue_scripts' );

	// Register an admin page for the block anlaytics view.
	add_action( 'admin_menu', __NAMESPACE__ . '\\add_block_admin_page' );
	add_action( 'admin_footer', __NAMESPACE__ . '\\modal_portal' );
}

/**
 * Synchronise any XBs on the page with a shadow post type.
 *
 * @param int $post_ID Post ID.
 * @param WP_Post $post Post object.
 * @param bool $update Whether this is an existing post being updated.
 */
function on_save_post( int $post_ID, WP_Post $post, bool $update ) : void {
	if ( $post->post_type === POST_TYPE ) {
		return;
	}

	if ( $post->post_type === 'revision' ) {
		return;
	}

	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}

	// Scan for XBs in the post content.
	$blocks = parse_blocks( $post->post_content );
	$xbs = find_xbs( $blocks );

	// Stop processing if no XBs on page.
	if ( empty( $xbs ) ) {
		return;
	}

	// Find referenced XBs.
	$existing_posts = new WP_Query( [
		'post_type' => POST_TYPE,
		'post_status' => 'any',
		'post_name__in' => array_filter( array_map( function ( array $xb ) : string {
			return $xb['attrs']['clientId'];
		}, $xbs ) ),
		'posts_per_page' => 100,
		'no_found_rows' => true,
	] );

	// Update or create XB posts.
	foreach ( $xbs as $index => $xb ) {
		if ( empty( $xb['attrs']['clientId'] ) ) {
			continue;
		}

		// Extract existing post if found.
		$posts = wp_list_filter( $existing_posts->posts, [
			'post_name' => $xb['attrs']['clientId'],
		] );
		$posts = array_values( $posts ); // Reset keys.

		// Generate a default using the current post title and instance number in the content.
		$default_title = sprintf( '%s (XB %s)', $post->post_title, $index + 1 );

		if ( empty( $posts ) ) {
			// Create new shadow XB post.
			wp_insert_post( [
				'post_type' => POST_TYPE,
				'post_status' => 'publish',
				'post_content' => serialize_block( $xb ),
				'post_name' => $xb['attrs']['clientId'],
				'post_author' => get_current_user_id(),
				'post_title' => $xb['attrs']['title'] ?? $default_title,
			] );
		} else {
			// Update existing post.
			wp_update_post( [
				'ID' => $posts[0]->ID,
				'post_content' => serialize_block( $xb ),
				'post_title' => $xb['attrs']['title'] ?? $default_title,
			] );
		}
	}
}

/**
 * Recursively find blocks in a parsed blocks array.
 *
 * Use parse_blocks() on raw post content data to get the required input array.
 *
 * @param array $blocks The parsed blocks data for a post.
 * @return array
 */
function find_xbs( array $blocks ) : array {
	// Supported block types.
	$xb_types = [
		'altis/personalization',
		'altis/experiment',
	];

	$xbs = [];

	foreach ( $blocks as $block ) {
		if ( ! in_array( $block['blockName'], $xb_types, true ) ) {
			if ( ! empty( $block['innerBlocks'] ) ) {
				$xbs = array_merge(
					$xbs,
					find_xbs( $block['innerBlocks'] )
				);
			}
			continue;
		}

		$xbs[] = $block;
	}

	return $xbs;
}

/**
 * Set up the Experience Block shadow post type.
 *
 * This is used for storing meta data and long term
 * aggregated analytics data storage as well as easier referencing in code.
 *
 * @return void
 */
function register_post_type() {
	register_extended_post_type(
		POST_TYPE,
		[
			'public' => false,
			'show_ui' => false,
			'dashboard_glance' => false,
			'block_editor' => true,
			'supports' => [
				'title',
				'editor',
			],
			'menu_icon' => 'dashicons-networking',
			'menu_position' => 152,
			'show_in_rest' => true,
			'rest_base' => 'xbs',
			'rest_controller_class' => __NAMESPACE__ . '\\REST_API\Posts_Controller',
			'hierarchical' => false,
		],
		[
			'singular' => __( 'Experience Block', 'altis-analytics' ),
			'plural' => __( 'Experience Blocks', 'altis-analytics' ),
		]
	);
}

/**
 * Adds an experience block category to the block editor.
 *
 * @param array $categories Array of block editor block type categories.
 * @return array The modified block categories array.
 */
function add_block_category( array $categories ) : array {
	$categories[] = [
		'slug' => 'altis-experience-blocks',
		'title' => __( 'Experience Blocks', 'altis-experiments' ),
	];

	return $categories;
}

/**
 * Reads and returns a block.json file to pass shared settings
 * between JS and PHP to the register blocks functions.
 *
 * @param string $name The directory name of the block relative to this file.
 * @return array|null The JSON data as an associative array or null on error.
 */
function get_block_settings( string $name ) : ?array {
	$json_path = __DIR__ . '/' . $name . '/block.json';

	// Check name is valid.
	if ( ! file_exists( $json_path ) ) {
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		trigger_error( sprintf( 'Error reading %/block.json: file does not exist.', $name ), E_USER_WARNING );
		return null;
	}

	// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	$json = file_get_contents( $json_path );

	// Decode the settings.
	$settings = json_decode( $json, ARRAY_A );

	// Check JSON is valid.
	if ( json_last_error() !== JSON_ERROR_NONE ) {
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		trigger_error( sprintf( 'Error decoding %/block.json: %s', $name, json_last_error_msg() ), E_USER_WARNING );
		return null;
	}

	return $settings;
}


/**
 * Fetch a post object by block client ID.
 *
 * @param string $client_id The block client ID.
 * @return WP_Post|null
 */
function get_block_post( string $client_id ) : ?WP_Post {
	static $block_posts = [];

	if ( isset( $block_posts[ $client_id ] ) ) {
		return $block_posts[ $client_id ];
	}

	$query = new WP_Query( [
		'post_type' => POST_TYPE,
		'post_name' => $client_id,
		'posts_per_page' => 1,
		'no_found_rows' => true,
	] );

	if ( empty( $query->posts ) ) {
		$block_posts[ $client_id ] = null;
		return null;
	}

	// Cache the lookup.
	$block_posts[ $client_id ] = $query->posts[0];

	return $block_posts[ $client_id ];
}

/**
 * Add menu page for Experience Insights.
 *
 * @return void
 */
function add_block_admin_page() {
	$type = get_post_type_object( POST_TYPE );

	add_submenu_page(
		'edit.php?post_type=' . POST_TYPE,
		__( 'Experience Insights', 'altis-analytics' ),
		__( 'Experience Insights', 'altis-analytics' ),
		$type->cap->read,
		'xb-analytics',
		function () {
			$post_id = intval( wp_unslash( $_GET['post'] ?? null ) );
			$client_id = sanitize_key( wp_unslash( $_GET['clientId'] ?? null ) );
			// Check for client ID and map to post ID if missing.
			if ( empty( $post_id ) && ! empty( $client_id ) ) {
				$post = get_block_post( $client_id );
				if ( $post ) {
					$post_id = $post->ID;
				}
			} elseif ( ! empty( $post_id ) && empty( $client_id ) ) {
				$post = get_post( $post_id );
				if ( $post ) {
					$client_id = $post->post_name;
				}
			}

			// Ensure we have a post.
			if ( empty( $client_id ) ) {
				printf( '<h2>' . esc_html__( 'Experience Block Not Found', 'altis-analytics' ) . '</h2>' );
				return;
			}

			printf(
				'<div id="altis-analytics-xb-block" data-client-id="%d">' .
				'<p class="loading"><span class="spinner is-active"></span> %s</p>' .
				'<noscript><div class="error msg">%s</div></noscript>' .
				'</div>',
				esc_attr( $client_id ),
				esc_html__( 'Loading...', 'altis-analytics' ),
				esc_html__( 'JavaScript is required to use the block insights view.', 'altis-analytics' )
			);
		}
	);
}

/**
 * Output markup for the XB block data modal.
 */
function modal_portal() {
	echo '<div id="altis-analytics-xb-block-modal"></div>';
}

/**
 * Register discrete scripts for use in multiple places.
 *
 * @return void
 */
function register_scripts() {
	wp_register_script(
		'altis-analytics-xb-data',
		Utils\get_asset_url( 'blocks/data.js' ),
		[
			'wp-api-fetch',
			'wp-url',
			'wp-data',
		],
		null
	);

	wp_register_script(
		'altis-analytics-xb-ui',
		Utils\get_asset_url( 'blocks/ui.js' ),
		[
			'altis-analytics-xb-data',
			'wp-core-data',
			'wp-components',
			'wp-i18n',
		],
		null
	);
}

/**
 * Enqueue block UI scripts.
 *
 * @return void
 */
function enqueue_scripts() {
	// Only queue things up by default on the block view pages.
	if ( get_current_screen()->id !== 'admin_page_xb-analytics' ) {
		return;
	}

	wp_enqueue_script( 'altis-analytics-xb-ui' );
}
