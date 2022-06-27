<?php
/**
 * Plugin Name: Altis Analytics
 * Description: Analytics layer for Altis powered by AWS Pinpoint.
 * Version: 4.3.0
 * Author: Human Made Limited
 * Author URI: https://humanmade.com/
 *
 * @package aws-analytics
 */

namespace Altis\Analytics;

const ROOT_DIR = __DIR__;
const ROOT_FILE = __FILE__;

// Check if this is installed as a self contained built version.
if ( file_exists( ROOT_DIR . '/vendor/autoload.php' ) ) {
	require_once ROOT_DIR . '/vendor/autoload.php';
}

require_once __DIR__ . '/inc/namespace.php';
require_once __DIR__ . '/inc/api/namespace.php';
require_once __DIR__ . '/inc/api/class-filter.php';
require_once __DIR__ . '/inc/utils/namespace.php';
require_once __DIR__ . '/inc/audiences/namespace.php';
require_once __DIR__ . '/inc/audiences/rest_api/class-posts-controller.php';
require_once __DIR__ . '/inc/audiences/rest_api/namespace.php';
require_once __DIR__ . '/inc/preview/namespace.php';
require_once __DIR__ . '/inc/dashboard/namespace.php';
require_once __DIR__ . '/inc/insights/namespace.php';
require_once __DIR__ . '/inc/blocks/namespace.php';
require_once __DIR__ . '/inc/blocks/rest_api/namespace.php';
require_once __DIR__ . '/inc/blocks/rest_api/class-posts-controller.php';
require_once __DIR__ . '/inc/experiments/namespace.php';
require_once __DIR__ . '/inc/experiments/titles/namespace.php';
require_once __DIR__ . '/inc/experiments/featured-images/namespace.php';
require_once __DIR__ . '/inc/export/class-endpoint.php';
require_once __DIR__ . '/inc/export/cron/namespace.php';
require_once __DIR__ . '/inc/export/namespace.php';

add_action( 'plugins_loaded', __NAMESPACE__ . '\\setup' );
