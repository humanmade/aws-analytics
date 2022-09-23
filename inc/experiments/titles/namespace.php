<?php
/**
 * Title AB testing feature.
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Experiments\Titles;

use Altis\Analytics\Experiments;
use Altis\Analytics\Utils;

/**
 * Bootstrap AB Tests Feature.
 *
 * @return void
 */
function setup() {
	add_action( 'init', __NAMESPACE__ . '\\init' );
}

/**
 * Register the AB test, and output filters.
 */
function init() {
	if ( ! is_admin() ) {
		add_filter( 'the_title', __NAMESPACE__ . '\\add_title_ab_test_to_title', 10, 2 );
	}

	Experiments\register_post_ab_test(
		'titles',
		[
			'label' => __( 'Titles', 'altis-analytics' ),
			'singular_label' => __( 'Title', 'altis-analytics' ),
			'goal' => 'click',
			'closest' => 'a',
			// Exclude all events from the target post page.
			'query_filter' => "attributes['postId'] != {post_id:String}",
			'query_filter_params' => function ( $post_id ) : array {
				return [
					'param_post_id' => $post_id,
				];
			},
			// Update the actual post title.
			'winner_callback' => function ( int $post_id, string $title ) {
				wp_update_post( [
					'ID' => $post_id,
					'post_title' => $title,
				] );
			},
			'post_types' => [
				'post',
				'page',
			],
			'show_ui' => true,
			'editor_scripts' => [
				Utils\get_asset_url( 'titles.js' ) => [
					'wp-plugins',
					'wp-blocks',
					'wp-i18n',
					'wp-editor',
					'wp-components',
					'wp-core-data',
					'wp-edit-post',
					'moment',
				],
			],
		]
	);
}

/**
 * Replace title output with the AB Test markup equivalent.
 *
 * @param string $title The current title text.
 * @param integer $post_id The post ID.
 * @return string|null
 */
function add_title_ab_test_to_title( string $title, int $post_id ) : ?string {
	return Experiments\output_ab_test_html_for_post( 'titles', $post_id, $title );
}
