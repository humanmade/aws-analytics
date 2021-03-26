<?php
/**
 * Title AB testing feature.
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Experiments\Titles;

use Altis\Analytics;
use Altis\Analytics\Experiments;
use Altis\Analytics\Utils;

/**
 * Bootstrap Title AB Tests Feature.
 *
 * @return void
 */
function setup() {
	add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\\admin_scripts' );
	add_action( 'init', __NAMESPACE__ . '\\init' );
	add_action( 'init', __NAMESPACE__ . '\\register_default_post_type_support', 9 );
}

/**
 * Load Block Editor sidebar plugin.
 *
 * @param string $hook Page hook suffix.
 */
function admin_scripts( string $hook ) {
	if ( ! in_array( $hook, [ 'post.php', 'post-new.php' ], true ) ) {
		return;
	}

	// Get supported post types.
	$supported_post_types = get_post_types_by_support( 'altis.experiments.titles' );

	if ( ! in_array( get_current_screen()->post_type, $supported_post_types, true ) ) {
		return;
	}

	wp_enqueue_script(
		'altis-experiments-features-titles',
		Utils\get_asset_url( 'titles.js' ),
		[
			'wp-plugins',
			'wp-blocks',
			'wp-i18n',
			'wp-editor',
			'wp-components',
			'wp-core-data',
			'wp-edit-post',
			'moment',
		],
		null
	);

	wp_add_inline_script(
		'altis-experiments-features-titles',
		sprintf(
			'window.Altis = window.Altis || {};' .
			'window.Altis.Analytics = window.Altis.Analytics || {};' .
			'window.Altis.Analytics.Experiments = window.Altis.Analytics.Experiments || {};' .
			'window.Altis.Analytics.Experiments.BuildURL = %s;',
			wp_json_encode( plugins_url( 'build', Analytics\ROOT_FILE ) )
		),
		'before'
	);
}

/**
 * Sets up the default post type support for title A/B tests.
 *
 * @uses apply_filters( 'altis.experiments.features.titles.post_types', [] )
 */
function register_default_post_type_support() {
	/**
	 * Filters the default post types supported by experiments.
	 *
	 * @param array $post_types Supported post types for title AB tests.
	 */
	$post_types = apply_filters( 'altis.experiments.features.titles.post_types', [
		'post',
		'page',
	] );

	foreach ( $post_types as $post_type ) {
		add_post_type_support( $post_type, 'altis.experiments.titles' );
	}
}

/**
 * Replace title output with the AB Test markup equivalent.
 *
 * @param string $title The current title text.
 * @param integer $post_id The post ID.
 * @return string
 */
function add_title_ab_test_to_title( string $title, int $post_id ) : string {
	return Experiments\output_ab_test_html_for_post( 'titles', $post_id, $title );
}

/**
 * Set up the post meta for our titles and create the tests.
 */
function init() {
	if ( ! is_admin() ) {
		add_filter( 'the_title', __NAMESPACE__ . '\\add_title_ab_test_to_title', 10, 2 );
	}

	Experiments\register_post_ab_test(
		'titles',
		[
			'label' => __( 'Titles', 'altis-analytics' ),
			'goal' => 'click',
			'closest' => 'a',
			// Exclude all events from the target post page.
			'query_filter' => function ( $test_id, $post_id ) : array {
				$url = get_the_permalink( $post_id );
				return [
					'must_not' => [
						[ 'prefix' => [ 'attributes.url.keyword' => $url ] ],
					],
				];
			},
			// Update the actual post title.
			'winner_callback' => function ( int $post_id, string $title ) {
				wp_update_post( [
					'ID' => $post_id,
					'post_title' => $title,
				] );
			},
			'post_types' => get_post_types_by_support( 'altis.experiments.titles' ),
		]
	);
}
