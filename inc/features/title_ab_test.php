<?php
/**
 * Title AB testing feature.
 */

namespace HM\Analytics\Features\Title_AB_Test;

use const HM\Analytics\ROOT_DIR;
use function HM\Analytics\register_post_ab_test;
use HM\Analytics\Post_AB_Test;

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

/**
 * Set up the post meta for our titles and create the tests.
 */
function init() {

	// Register test object.
	register_post_ab_test( 'titles', function ( Post_AB_Test $test ) {
		$post_id = $test->get_post_id();

		// Get alternative titles.
		$titles = $test->get_data( 'variants' );

		// Get post URL for selectors and filters.
		$url = get_the_permalink( $post_id );

		/**
		 * Override the default selector.
		 *
		 * @param string $selector CSS Selector to apply transformations to.
		 */
		$selector = apply_filters(
			'hm.analytics.ab_test.titles.selector',
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

		// Create clickthrough conversion goal.
		$test->set_goal( __( 'Click through rate', 'hm-analytics' ), [
			// Target only clicks matching our URL.
			'filter' => [
				[
					'term' => [ 'event_type.keyword' => 'click' ],
				],
				[
					'term' => [ 'attributes.elementHref.keyword' => $url ],
				],
			],
		], [
			// Ignore events on the target page.
			'must_not' => [
				[
					'term' => [ 'attributes.url.keyword' => $url ],
				],
			],
		] );
	} );
}
