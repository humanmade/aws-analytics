<?php
/**
 * A/B Test Block Server Side.
 *
 * @phpcs:disable HM.Files.NamespaceDirectoryName.NameMismatch
 * @phpcs:disable HM.Files.FunctionFileName.WrongFile
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Blocks\AB_Test;

use Altis\Analytics;
use Altis\Analytics\Blocks;
use Altis\Analytics\Experiments;
use Altis\Analytics\Utils;

const BLOCK = 'ab-test';

/**
 * Registers the block type assets and server side rendering.
 */
function setup() {
	$block_data = Blocks\get_block_settings( BLOCK );

	// Queue up JS files.
	add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\enqueue_assets' );

	// Register the block.
	register_block_type( $block_data['name'], [
		'attributes' => $block_data['settings']['attributes'],
		'render_callback' => __NAMESPACE__ . '\\render_block',
	] );

	// Process block attributes on post save.
	add_action( 'altis.analytics.blocks.save_post', __NAMESPACE__ . '\\process_xb_attrs', 10, 2 );

	// Register A/B tests with experiments framework.
	add_action( 'init', __NAMESPACE__ . '\\register_tests' );
}

/**
 * Enqueues the block assets.
 */
function enqueue_assets() {
	wp_enqueue_script(
		'altis-experiments-features-blocks-ab-test',
		Utils\get_asset_url( 'blocks/ab-test.js' ),
		[
			'wp-plugins',
			'wp-blocks',
			'wp-i18n',
			'wp-editor',
			'wp-components',
			'wp-edit-post',
			'wp-html-entities',
			'altis-analytics-xb-data',
		],
		null
	);

	wp_add_inline_script(
		'altis-experiments-features-blocks-ab-test',
		sprintf(
			'window.Altis = window.Altis || {};' .
			'window.Altis.Analytics = window.Altis.Analytics || {};' .
			'window.Altis.Analytics.Experiments = window.Altis.Analytics.Experiments || {};' .
			'window.Altis.Analytics.Experiments.BuildURL = %s;' .
			'window.Altis.Analytics.Experiments.Goals = %s;',
			wp_json_encode( plugins_url( 'build', Analytics\ROOT_FILE ) ),
			wp_json_encode( (object) Experiments\get_goals() )
		),
		'before'
	);
}

/**
 * Render callback for the experience block.
 *
 * Because this block only saves <InnerBlocks.Content> on the JS side,
 * the content string represents only the wrapped inner block markup.
 *
 * @param array $attributes The block's attributes object.
 * @param string $inner_content The block's saved content.
 * @return string The final rendered block markup, as an HTML string.
 */
function render_block( array $attributes, ?string $inner_content = '' ) : string {
	$client_id = $attributes['clientId'] ?? null;
	$class_name = $attributes['className'] ?? '';
	$align = $attributes['align'] ?? 'none';
	$percentage = $attributes['percentage'] ?? 100;

	// Warn if a client ID is not set.
	if ( ! $client_id ) {
		trigger_error( 'A/B test content blocks must have a client ID set to track impressions. Please re-save the post content to generate one.', E_USER_WARNING );
		$client_id = wp_generate_uuid4();
	}

	// Add alignment class.
	if ( ! empty( $align ) ) {
		$class_name .= sprintf( 'align%s', $align );
	}

	$post = Blocks\get_block_post( $client_id );

	// Get a unique ID for the block and apply it to the templates in $inner_content.
	$inner_content = str_replace( '__PARENT_CLIENT_ID__', $client_id, $inner_content );

	return sprintf(
		'%s<ab-test-block class="%s" client-id="%s" post-id="%s" traffic-percentage="%s"></ab-test-block>',
		$inner_content,
		$class_name,
		$client_id,
		$post->ID ?? '',
		$percentage
	);
}

/**
 * Process the XB attrs further when the XB is created.
 *
 * @param integer $xb_post_id ID of XB post that has just been updated or created.
 * @param array $xb The block data array.
 * @return void
 */
function process_xb_attrs( int $xb_post_id, array $xb ) {
	$post = get_post( $xb_post_id );

	// Check it's an ab-test block.
	if ( Blocks\get_block_type( $post ) !== BLOCK ) {
		return;
	}

	$client_id = $post->post_name;

	// Always run the test for blocks.
	$start_time = Utils\milliseconds();
	$end_time = $start_time + ( 3 * MONTH_IN_SECONDS * 1000 ); // 3 months in the future.
	Experiments\update_ab_test_start_time_for_post( $client_id, $xb_post_id, $start_time );
	Experiments\update_ab_test_end_time_for_post( $client_id, $xb_post_id, $end_time );

	// Set variants.
	$variants = array_map( function ( $variant ) {
		return render_block( $variant );
	}, $xb['innerBlocks'] );
	Experiments\update_ab_test_variants_for_post( $client_id, $xb_post_id, $variants );

	// Set traffic percent.
	Experiments\update_ab_test_traffic_percentage_for_post( $client_id, $xb_post_id, $xb['attrs']['percentage'] ?? 100 );

	// Start the test if parent post is published.
	Experiments\update_is_ab_test_paused_for_post( $client_id, $xb_post_id, $xb['attrs']['paused'] ?? false );
	Experiments\update_is_ab_test_started_for_post( $client_id, $xb_post_id, is_post_publicly_viewable( $post->post_parent ) );
}

/**
 * Register experiment for AB test blocks.
 *
 * @return void
 */
function register_test() {
	Experiments\register_post_ab_test( 'xb', [
		'label' => __( 'A/B Test Block', 'altis-analytics' ),
		'goal' => 'conversion',
		'query_filter' => function ( $test_id, $post_id ) : array {
			// Filter by experience views and conversion events for this block.
			$block = get_post( $post_id );
			return [
				'filter' => [
					[
						[ 'terms' => [ 'event_type.keyword' => [ 'experienceView', 'conversion' ] ] ],
						[ 'term' => [ 'attributes.clientId.keyword' => $block->post_name ] ],
					],
				],
			];
		},
		'post_types' => [ Blocks\POST_TYPE ],
	] );
}
