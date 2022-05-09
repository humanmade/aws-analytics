<?php
/**
 * Shim Block Server Side.
 *
 * @phpcs:disable HM.Files.NamespaceDirectoryName.NameMismatch
 * @phpcs:disable HM.Files.FunctionFileName.WrongFile
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Blocks\Shim;

use Altis\Analytics\Blocks;

const BLOCK = 'shim';

/**
 * Registers the block type assets and server side rendering.
 */
function setup() {
	$block_data = Blocks\get_block_settings( BLOCK );

	// Shim server side render block to allow passing inner blocks as attribute.
	add_filter( 'render_block_data', __NAMESPACE__ . '\\ssr_inner_blocks_shim' );

	// Register the block.
	register_block_type( $block_data['name'], [
		'attributes' => $block_data['settings']['attributes'],
		'render_callback' => __NAMESPACE__ . '\\render_block',
	] );
}

/**
 * Render callback for the personalization variant block.
 *
 * Because this block only saves <InnerBlocks.Content> on the JS side,
 * the content string represents only the wrapped inner block markup.
 *
 * @param array $attributes The block's attributes object.
 * @param string $inner_content The block's saved content.
 * @return string The final rendered block markup, as an HTML string.
 */
function render_block( array $attributes, ?string $inner_content ) : string {
	return sprintf( '<div>%s</div>', $inner_content );
}

/**
 * Extract inner blocks from attributes.
 *
 * @param array $block The block configuration.
 * @return array
 */
function ssr_inner_blocks_shim( array $block ) : array {
	if ( $block['blockName'] !== 'altis/shim' ) {
		return $block;
	}

	// Populate inner blocks by parsing content.
	$block['innerBlocks'] = parse_blocks( $block['attrs']['content'] ?? [] );

	// Populate inner content with an array of null placeholders so inner blocks are processed.
	$block['innerContent'] = array_fill( 0, count( $block['innerBlocks'] ), null );

	return $block;
}
