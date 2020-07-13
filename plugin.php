<?php
/**
 * Plugin Name: Altis Analytics
 * Description: Analytics layer for Altis powered by AWS Pinpoint.
 * Version: 2.2.5
 * Author: Human Made Limited
 * Author URI: https://humanmade.com/
 *
 * @package altis-analytics
 */

namespace Altis\Analytics;

const ROOT_DIR = __DIR__;

// Check if this is installed as a self contained built version.
if ( file_exists( ROOT_DIR . '/vendor/autoload.php' ) ) {
	require_once ROOT_DIR . '/vendor/autoload.php';
}

require_once __DIR__ . '/inc/namespace.php';
require_once __DIR__ . '/inc/audiences/namespace.php';
require_once __DIR__ . '/inc/audiences/rest_api/namespace.php';
require_once __DIR__ . '/inc/preview/namespace.php';
require_once __DIR__ . '/inc/utils/namespace.php';

add_action( 'plugins_loaded', __NAMESPACE__ . '\\setup' );
