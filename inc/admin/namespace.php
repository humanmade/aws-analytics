<?php
/**
 * Administration page helper functions.
 *
 * @package aws-analytics
 */
namespace Altis\Accelerate\Admin;

use Altis;

/**
 * Add a wrapper for admin notices on custom admin pages.
 *
 * @return void
 */
function add_notices_wrapper() : void {
	// High priority so the opening div is before any notices.
	add_action( 'admin_notices', __NAMESPACE__ . '\\add_notices_wrapper_open', 0 );
	// Low priority so the closing div is after any notices.
	add_action( 'admin_notices', __NAMESPACE__ . '\\add_notices_wrapper_close', 999999 );
}

/**
 * Adds an opening div to wrap around notices in the Accelerate Dashboard.
 *
 * @return void
 */
function add_notices_wrapper_open() : void {
	echo '<div id="Altis_Dashboard__notices">';
}

/**
 * Adds a closing div to wrap around notices in the Accelerate Dashboard.
 *
 * @return void
 */
function add_notices_wrapper_close() {
	echo '</div>';
}

/**
 * Display Accelerate React apps.
 *
 * @return void
 */
function render_page( string $page = '' ) : void {
	require_once ABSPATH . 'wp-admin/admin-header.php';

	echo '<div id="altis-analytics-root">';

	if ( Altis\get_environment_type() === 'local' ) {
		echo "<p>Ensure you're running the Webpack server. You may also need to open the script URL directly to accept the SSL certificate.</p>";
	}

	echo '</div>';
	require_once ABSPATH . 'wp-admin/admin-footer.php';
}
