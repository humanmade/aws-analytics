<?php
/**
 * Dashboard Analytics / Content Explorer.
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Dashboard;

use Altis;
use Altis\Analytics\API;
use Altis\Analytics\Utils;
use WP_Post_Type;

const SCRIPT_ID = 'altis-analytics-ui';
const STYLE_ID = 'altis-analytics-ui';

/**
 * Set up the Dashboard Analytics page.
 */
function setup() {
	// Queue up Altis Accelerate Dashboard replacement for standard dashboard.
	if ( defined( 'ALTIS_ACCELERATE_DASHBOARD' ) && ! ALTIS_ACCELERATE_DASHBOARD ) {
		return;
	}

	add_action( 'load-index.php', __NAMESPACE__ . '\\load_dashboard' );
	add_action( 'admin_menu', __NAMESPACE__ . '\\add_widgets_submenu' );

	add_action( 'pre_get_posts', __NAMESPACE__ . '\\block_preview_check' );
}

/**
 * Adds the regular Dashboard Widgets view as a subpage of the Dashboard menu.
 *
 * @return void
 */
function add_widgets_submenu() : void {
	add_submenu_page(
		'index.php',
		__( 'Dashboard Widgets' ),
		__( 'Widgets' ),
		'read',
		'index.php?widgets=1',
		'',
		1
	);
}

/**
 * Replace the site dashboard with the Accelerate dashboard.
 *
 * @return void
 */
function load_dashboard() {
	global $title;

	// Don't replace network admin.
	if ( is_network_admin() ) {
		return;
	}

	// Support default dashboard on subpage of dashboard menu.
	if ( isset( $_GET['widgets'] ) ) {
		return;
	}

	if ( ! current_user_can( 'edit_posts' ) ) {
		return;
	}

	Utils\enqueue_assets( 'accelerate' );

	add_filter( 'screen_options_show_screen', '__return_false' );

	// Set admin page title.
	$title = __( 'Accelerate Dashboard', 'altis' );
	$user = wp_get_current_user();

	$post_types = get_post_types( [
		'show_in_menu' => true,
		'public' => true,
	], 'objects' );

	// Trackable post types that do not have their own front end URL.
	if ( post_type_exists( 'wp_block' ) ) {
		$post_types = array_merge( [ get_post_type_object( 'wp_block' ) ], $post_types );
	}

	// Add XBs first if available.
	if ( post_type_exists( 'xb' ) ) {
		$post_types = array_merge( [ get_post_type_object( 'xb' ) ], $post_types );
	}

	$post_types = array_map( function ( WP_Post_Type $post_type ) {
		return [
			'name' => $post_type->name,
			'label' => $post_type->labels->name,
			'singular_label' => $post_type->labels->singular_name,
		];
	}, $post_types );

	// Don't show links if feature unavailable.
	$insights_enabled = Utils\is_feature_enabled( 'insights' );

	wp_localize_script( 'altis-analytics-accelerate', 'AltisAccelerateDashboardData', [
		'api_namespace' => API\API_NAMESPACE,
		'version' => get_plugin_version(),
		'user' => [
			'id' => get_current_user_id(),
			'name' => $user->get( 'display_name' ),
			'canViewAnalytics' => $insights_enabled && current_user_can( 'manage_options' ),
			'canViewInsights' => $insights_enabled && current_user_can( 'edit_audiences' ),
		],
		'post_types' => array_values( $post_types ),
	] );

	require_once ABSPATH . 'wp-admin/admin-header.php';
	render_page();
	require_once ABSPATH . 'wp-admin/admin-footer.php';

	exit;
}

/**
 * Display Accelerate React apps.
 *
 * @return void
 */
function render_page() {
	echo '<div id="altis-analytics-root">';

	if ( Altis\get_environment_type() === 'local' ) {
		echo "<p>Ensure you're running the Webpack server. You may also need to open the script URL directly to accept the SSL certificate.</p>";
	}

	echo '</div>';
}

/**
 * Return plugin version.
 *
 * @return string
 */
function get_plugin_version() : string {
	// Only show version if this is embedded in the accelerate plugin.
	if ( defined( 'Altis\\Accelerate\\VERSION' ) ) {
		return \Altis\Accelerate\VERSION;
	}
	return '';
}

/**
 * Intercept block preview requests for block thumbnail service requests.
 *
 * @param \WP_Query $query WP Query object.
 *
 * @return void
 */
function block_preview_check( \WP_Query $query ) : void {
	$block_id = filter_input( INPUT_GET, 'preview-block-id', FILTER_SANITIZE_NUMBER_INT );
	$hmac = filter_input( INPUT_GET, 'key' );

	if (
		! $query->is_main_query()
		|| empty( $block_id )
		|| empty( $hmac )
		|| $hmac !== get_block_thumbnail_request_hmac( $block_id )
	) {
		return;
	}

	if ( ! is_block_thumbnail_allowed( $block_id ) ) {
		return;
	}

	$query->set( 'p', $block_id );
	$query->set( 'post_type', [ 'wp_block', 'xb' ] );
	$query->set( 'post_status', [ 'publish', 'inherit' ] );

	add_action( 'template_redirect', __NAMESPACE__ . '\\block_thumbnail_template_override' );
}

/**
 * Return whether block thumbnail functionality is allowed.
 *
 * @param int $block_id Block ID.
 *
 * @return boolean
 */
function is_block_thumbnail_allowed( int $block_id = null ) : bool {
	/**
	 * Filters the ability of using block thumbnail API / service.
	 *
	 * @param int $block_id Block ID to preview
	 */
	return (bool) apply_filters( 'altis.accelerate.allow_block_thumbnails', true, $block_id );
}

/**
 * Generated an HMAC for a block preview thumbnail request.
 *
 * @param integer $block_post_id Post ID of the block to preview.
 *
 * @return string
 */
function get_block_thumbnail_request_hmac( int $block_post_id ) : string {
	$auth_key = defined( 'AUTH_KEY' ) ? AUTH_KEY : get_site_option( 'auth_key', '' );
	if ( empty( $auth_key ) ) {
		$auth_key = wp_generate_password( 64, true, true );
		update_site_option( 'auth_key', $auth_key );
	}
	return hash_hmac( 'md5', $block_post_id, $auth_key );
}

/**
 * Override template to output a block preview markup.
 *
 * @return void
 */
function block_thumbnail_template_override() : void {
	global $content_width;

	get_header();
	printf( '<style>.altis-block-preview { width: %spx; margin: 0 auto; }</style>', (int) $content_width );
	echo '<div class="altis-block-preview">';

	the_content();

	echo '</div>';
	get_footer();
	exit;
}
