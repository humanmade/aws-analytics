<?php
/**
 * Audiences.
 *
 * @package altis-analytics
 */

namespace Altis\Analytics\Audiences;

use function Altis\Analytics\Utils\query;
use WP_Post;

const POST_TYPE = 'audiences';

function setup() {
	add_action( 'init', __NAMESPACE__ . '\\register_post_type' );
	add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\\admin_enqueue_scripts' );
	add_action( 'edit_form_after_title', __NAMESPACE__ . '\\audience_ui' );
	add_action( 'add_meta_boxes_' . POST_TYPE, __NAMESPACE__ . '\\meta_boxes' );
}

/**
 * Setup the audiences data store.
 */
function register_post_type() {
	register_extended_post_type( POST_TYPE, [
		'supports' => [ 'title' ],
	] );
}

function meta_boxes() {
	remove_meta_box( 'submitdiv', POST_TYPE, 'side' );
	remove_meta_box( 'slugdiv', POST_TYPE, 'normal' );

	// Add our replaced submitdiv meta box.
	add_meta_box( 'audience-options', __( 'Options', 'altis-analytics' ), function () {
		echo '<div id="altis-analytics-audience-options"></div>';
	}, POST_TYPE, 'side', 'high' );
}

function audience_ui( WP_Post $post ) {
	if ( $post->post_type !== POST_TYPE ) {
		return;
	}

	echo '<div id="altis-analytics-audience-ui"></div>';
}

function admin_enqueue_scripts() {
	wp_enqueue_script(
		'altis-analytics-audience-ui',
		plugins_url( 'build/audience.js', dirname( __FILE__, 2 ) ),
		[
			'react',
			'react-dom',
			'wp-i18n',
			'wp-hooks',
			'wp-data',
			'wp-components',
		],
		'__AUDIENCE_SCRIPT_HASH__',
		true
	);
}
