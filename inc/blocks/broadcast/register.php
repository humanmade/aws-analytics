<?php
/**
 * Broadcast Block Server Side.
 *
 * @phpcs:disable HM.Files.NamespaceDirectoryName.NameMismatch
 * @phpcs:disable HM.Files.FunctionFileName.WrongFile
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Blocks\Broadcast;

use Altis\Analytics;
use Altis\Analytics\Blocks;
use Altis\Analytics\Utils;

const BLOCK = 'broadcast';

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
		'altis-experiments-features-blocks-broadcast',
		Utils\get_asset_url( 'blocks/broadcast.js' ),
		[
			'wp-api-fetch',
			'wp-plugins',
			'wp-blocks',
			'wp-i18n',
			'wp-editor',
			'wp-block-editor',
			'wp-components',
			'wp-edit-post',
			'wp-html-entities',
		],
		null
	);

	wp_add_inline_script(
		'altis-experiments-features-blocks-broadcast',
		sprintf(
			'window.Altis = window.Altis || {};' .
			'window.Altis.Analytics = window.Altis.Analytics || {};' .
			'window.Altis.Analytics.Broadcast = window.Altis.Analytics.Broadcast || {};' .
			'window.Altis.Analytics.Broadcast.ManagerURL = "%s";',
			'edit.php?post_type=broadcast'
		),
		'before'
	);

	wp_enqueue_style(
		'altis-experiments-features-blocks-broadcast-style',
		plugins_url( 'inc/blocks/broadcast/edit.css', Analytics\ROOT_FILE ),
		[
			'wp-components',
		],
		'2021-03-26-2'
	);
}

/**
 * Render callback for the Broadcast block.
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
	$broadcast_id = $attributes['broadcast'] ?? null;
	$class_name = $attributes['className'] ?? '';
	$align = $attributes['align'] ?? 'none';

	// Add alignment class.
	if ( ! empty( $align ) ) {
		$class_name .= sprintf( 'align%s', $align );
	}

	return sprintf(
		'%s<broadcast-block class="%s" client-id="%s" broadcast-id="%s"></broadcast-block>',
		$inner_content,
		$class_name,
		$client_id,
		$broadcast_id
	);
}
