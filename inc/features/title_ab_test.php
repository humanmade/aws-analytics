<?php
/**
 * Title AB testing feature.
 */

namespace HM\Analytics\Features\Title_AB_Test;

use const HM\Analytics\ROOT_DIR;
use function HM\Analytics\is_test_running_for_post;
use function HM\Analytics\output_test_html_for_post;
use function HM\Analytics\register_post_ab_test;

/**
 * Bootstrap Title AB Tests Feature.
 *
 * @return void
 */
function setup() {
	add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\\admin_scripts' );
	add_action( 'init', __NAMESPACE__ . '\\init' );
}

/**
 * Load Block Editor sidebar plugin.
 *
 * @param string $hook
 */
function admin_scripts( string $hook ) {
	if ( ! in_array( $hook, [ 'post.php', 'post-new.php' ], true ) ) {
		return;
	}

	if ( ! in_array( get_current_screen()->post_type, get_post_types( [ 'public' => true ] ), true ) ) {
		return;
	}

	wp_enqueue_script(
		'hm_analytics_feature_title_ab_test',
		plugins_url( 'build/features/title-ab-test.js', ROOT_DIR . '/plugin.php' ),
		[
			'wp-plugins',
			'wp-blocks',
			'wp-i18n',
			'wp-editor',
			'wp-components',
			'wp-core-data',
			'wp-edit-post',
		]
	);
}

function add_title_ab_test_to_title( string $title, int $post_id ) : string {
	if ( ! is_test_running_for_post( 'titles', $post_id ) ) {
		return $title;
	}

	return output_test_html_for_post( 'titles', $post_id, $title );
}

/**
 * Set up the post meta for our titles and create the tests.
 */
function init() {
	add_filter( 'the_title', __NAMESPACE__ . '\\add_title_ab_test_to_title', 10, 2 );

	register_post_ab_test(
		'titles',
		[
			'rest_api_variants_field' => 'alternative_titles',
			'metric'                  => 'click',
		]
	);
}
