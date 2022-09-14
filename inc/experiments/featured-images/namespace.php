<?php
/**
 * Featured Images AB testing feature.
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Experiments\FeaturedImages;

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
		add_filter( 'post_thumbnail_html', __NAMESPACE__ . '\\filter_post_thumbnail_html_ab_test_values', 10, 5 );
	}

	Experiments\register_post_ab_test(
		'featured_images',
		[
			'label' => __( 'Featured Images', 'altis-analytics' ),
			'singular_label' => __( 'Featured Image', 'altis-analytics' ),
			'rest_api_variants_type' => 'int',
			'goal' => 'click',
			'closest' => 'a',
			'variant_callback' => function ( $value, int $post_id, array $args ) {
				return wp_get_attachment_image( $value, $args['size'], false, $args['attr'] );
			},
			'winner_callback' => function ( int $post_id, string $value ) {
				update_post_meta( $post_id, '_thumbnail_id', $value );
			},
			'post_types' => [
				'post',
				'page',
			],
			// Exclude all events from the target post page.
			'query_filter' => function ( $post_id ) : string {
				return sprintf( "attributes['postId'] != '%d'", $post_id );
			},
			'show_ui' => true,
			'editor_scripts' => [
				Utils\get_asset_url( 'featured-images.js' ) => [
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
 * Replace post thumbnail output with the equivalent AB Test markup.
 *
 * @param string       $html              The post thumbnail HTML.
 * @param int          $post_id           The post ID.
 * @param int          $post_thumbnail_id The post thumbnail ID.
 * @param string|int[] $size              Requested image size. Can be any registered image size name, or
 *                                        an array of width and height values in pixels (in that order).
 * @param string       $attr              Query string of attributes.
 *
 * @return string
 */
function filter_post_thumbnail_html_ab_test_values( string $html, int $post_id, int $post_thumbnail_id, $size, $attr ) : string {
	return Experiments\output_ab_test_html_for_post( 'featured_images', $post_id, $html, [
		'size' => $size,
		'attr' => $attr,
	] );
}
