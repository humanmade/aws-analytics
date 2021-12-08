<?php
/**
 * AB Test Variant Block Server Side.
 *
 * @phpcs:disable HM.Files.NamespaceDirectoryName.NameMismatch
 * @phpcs:disable HM.Files.FunctionFileName.WrongFile
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Blocks\AB_Test_Variant;

use Altis\Analytics;
use Altis\Analytics\Blocks;
use Altis\Analytics\Utils;

const BLOCK = 'ab-test-variant';

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
}

/**
 * Enqueues the block assets.
 */
function enqueue_assets() {
	wp_enqueue_script(
		'altis-experiments-features-blocks-ab-test-variant',
		Utils\get_asset_url( 'blocks/ab-test-variant.js' ),
		[],
		null
	);

	wp_add_inline_script(
		'altis-experiments-features-blocks-ab-test-variant',
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
 * Render callback for the A/B test variant block.
 *
 * Because this block only saves <InnerBlocks.Content> on the JS side,
 * the content string represents only the wrapped inner block markup.
 *
 * @param array $attributes The block's attributes object.
 * @param string $inner_content The block's saved content.
 * @return string The final rendered block markup, as an HTML string.
 */
function render_block( array $attributes, ?string $inner_content = '' ) : string {
	$fallback = $attributes['fallback'] ?? false;
	$goal = $attributes['goal'] ?? '';
	$percentage = $attributes['percentage'] ?? '';

	// If this is the fallback variant output the template with different attributes
	// for easier and more specific targeting by document.querySelector().
	if ( $fallback ) {
		return sprintf(
			'<template data-fallback data-parent-id="__PARENT_CLIENT_ID__" data-goal="%1$s" data-weight="%2$s">%3$s</template><noscript>%3$s</noscript>',
			esc_attr( $goal ),
			$percentage,
			$inner_content
		);
	}

	return sprintf(
		'<template data-parent-id="__PARENT_CLIENT_ID__" data-goal="%s" data-weight="%s">%s</template>',
		esc_attr( $goal ),
		$percentage,
		$inner_content
	);
}
