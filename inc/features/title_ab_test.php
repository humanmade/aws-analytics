<?php
/**
 * Title AB testing feature.
 */

namespace HM\Analytics\Features\Title_AB_Test;

use const HM\Analytics\ROOT_DIR;
use function HM\Analytics\register_post_ab_test;
use WP_Query;

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
	if ( ! in_array( $hook, [ 'post.php' ], true ) ) {
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

/**
 * Set up the post meta for our titles and create the tests.
 */
function init() {
	$public_post_types = get_post_types( [ 'public' => true ] );

	foreach( $public_post_types as $post_type ) {
		register_post_meta( $post_type, '_hm_analytics_ab_titles', [
			'show_in_rest' => true,
			'single' => false,
			'type' => 'string',
		] );
	}

	// Register tests.
	$test_posts = new WP_Query( [
		'no_found_rows' => true,
		'posts_per_page' => 300,
		'post_type' => $public_post_types,
		'post_status' => 'publish',
		'meta_key' => '_hm_analytics_ab_titles',
		'fields' => 'ids',
	] );

	if ( $test_posts->have_posts() ) {
		foreach ( $test_posts->posts as $post_id ) {
			register_test( $post_id );
		}
	}
}

/**
 * Create the titles AB Test for the given post ID.
 *
 * @param integer $post_id
 */
function register_test( int $post_id ) {
	$titles = get_post_meta( $post_id, '_hm_analytics_ab_titles' );

	// Create test object.
	$test = register_post_ab_test( 'titles', $post_id );

	// Get post URL for selectors and filters.
	$url = get_the_permalink( $post_id );

	/**
	 * Override the default selector.
	 *
	 * @param string $selector CSS Selector to apply transformations to.
	 */
	$selector = apply_filters(
		'hm.analytics.title_ab_test.selector',
		sprintf(
			'.post-%d h1, a[href="%s"]',
			$post_id,
			$url
		),
		$post_id
	);

	// Add variants.
	foreach ( $titles as $title ) {
		$test->add_variant( [
			[
				'selector' => $selector,
				'text' => $title,
			]
		] );
	}

	// Set clickthrough conversion goal.
	$test->set_goal( __( 'Click through rate', 'hm-analytics' ), 'click', [
		// Target only clicks matching our URL.
		'attributes.elementHref' => [
			'operator' => '^=',
			'value' => $url,
		],
	], [
		// Ignore actual page.
		'attributes.url' => [
			'operator' => '!=',
			'value' => $url,
		],
	] );
}
