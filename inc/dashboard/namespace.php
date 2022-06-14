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
	if ( ! defined( 'ALTIS_ACCELERATE_DASHBOARD' ) || ALTIS_ACCELERATE_DASHBOARD ) {
		add_action( 'load-index.php', __NAMESPACE__ . '\\load_dashboard' );
	}
}

/**
 * Replace the site dashboard with the Accelerate dashboard.
 *
 * @return void
 */
function load_dashboard() {
	// Don't replace network admin.
	if ( is_network_admin() ) {
		return;
	}

	if ( ! current_user_can( 'edit_posts' ) ) {
		return;
	}

	Utils\enqueue_assets( 'accelerate' );

	add_filter( 'screen_options_show_screen', '__return_false' );

	$user = wp_get_current_user();

	$post_types = array_merge(
		// Trackable post types that do not have their own front end URL.
		[
			get_post_type_object( 'wp_block' ),
		],
		get_post_types( [
			'show_in_menu' => true,
			'public' => true,
		], 'objects' )
	);

	// Add XBs first if available.
	if ( post_type_exists( 'xb' ) ) {
		$post_types = array_merge( [ get_post_type_object( 'xb' ) ], $post_types );
	}

	$post_types = array_map( function ( WP_Post_Type $post_type ) {
		return [
			'name' => $post_type->name,
			'label' => $post_type->labels->name,
		];
	}, $post_types );

	wp_localize_script( 'altis-analytics-accelerate', 'AltisAccelerateDashboardData', [
		'api_namespace' => API\API_NAMESPACE,
		'user' => [
			'id' => get_current_user_id(),
			'name' => $user->get( 'display_name' ),
			'canViewAnalytics' => current_user_can( 'manage_options' ),
			'canViewInsights' => current_user_can( 'edit_audiences' ),
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
