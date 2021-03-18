<?php
/**
 * Personalization Block Server Side.
 *
 * @phpcs:disable HM.Files.NamespaceDirectoryName.NameMismatch
 * @phpcs:disable HM.Files.FunctionFileName.WrongFile
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Blocks\Personalization;

use Altis\Analytics;
use Altis\Analytics\Blocks;
use Altis\Analytics\Experiments;
use Altis\Analytics\Utils;

const BLOCK = 'personalization';

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
		'altis-experiments-features-blocks-personalization',
		Utils\get_asset_url( 'blocks/personalization.js' ),
		[
			'wp-plugins',
			'wp-blocks',
			'wp-i18n',
			'wp-editor',
			'wp-components',
			'wp-edit-post',
			'altis-analytics-xb-data',
			'altis-experiments-features-blocks-personalization-variant',
			// Exports the audience UI modal component.
			'altis-analytics-audience-ui',
		],
		null
	);

	wp_add_inline_script(
		'altis-experiments-features-blocks-personalization',
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

	// Queue up editor CSS.
	wp_enqueue_style(
		'altis-experiments-features-blocks-personalization',
		plugins_url( 'inc/blocks/personalization/edit.css', Analytics\ROOT_FILE ),
		[],
		'2021-03-18-1'
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

	// Warn if a client ID is not set.
	if ( ! $client_id ) {
		trigger_error( 'Personalized content blocks must have a client ID set to track impressions. Please re-save the post content to generate one.', E_USER_WARNING );
		$client_id = wp_generate_uuid4();
	}

	// Add alignment class.
	if ( ! empty( $align ) ) {
		$class_name .= sprintf( 'align%s', $align );
	}

	// Get a unique ID for the block and apply it to the templates in $inner_content.
	$inner_content = str_replace( '__PARENT_CLIENT_ID__', $client_id, $inner_content );

	return sprintf(
		'%s<personalization-block class="%s" client-id="%s"></personalization-block>',
		$inner_content,
		$class_name,
		$client_id
	);
}
