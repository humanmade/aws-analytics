<?php
/**
 * Plugin Name: Altis Analytics
 * Description: Analytics layer for Altis powered by AWS Pinpoint.
 *
 * @package altis-analytics
 */

namespace Altis\Analytics;

const ROOT_DIR = __DIR__;

// Check if this is installed as a self contained built version.
if ( file_exists( ROOT_DIR . '/vendor/autoload.php' ) ) {
	require_once ROOT_DIR . '/vendor/autoload.php';
}

require_once 'inc/namespace.php';

add_action( 'plugins_loaded', __NAMESPACE__ . '\\setup' );
