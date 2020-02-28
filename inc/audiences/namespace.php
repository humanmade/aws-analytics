<?php
/**
 * Audiences.
 *
 * @package altis-analytics
 */

namespace Altis\Analytics\Audiences;

use function Altis\Analytics\Utils\query;
use WP_Post;

const POST_TYPE = 'audiences';

function setup() {
	add_action( 'init', __NAMESPACE__ . '\\register_post_type' );
	add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\\admin_enqueue_scripts' );
	add_action( 'edit_form_after_title', __NAMESPACE__ . '\\audience_ui' );
	add_action( 'add_meta_boxes_' . POST_TYPE, __NAMESPACE__ . '\\meta_boxes' );
}

/**
 * Setup the audiences data store.
 */
function register_post_type() {
	register_extended_post_type( POST_TYPE, [
		'public' => false,
		'show_ui' => true,
		'supports' => [ 'title' ],
		'menu_icon' => 'dashicons-groups',
		'menu_position' => 151
	] );
}

function meta_boxes() {
	remove_meta_box( 'submitdiv', POST_TYPE, 'side' );
	remove_meta_box( 'slugdiv', POST_TYPE, 'normal' );

	// Add our replaced submitdiv meta box.
	add_meta_box( 'audience-options', __( 'Options', 'altis-analytics' ), function () {
		echo '<div id="altis-analytics-audience-options"></div>';
	}, POST_TYPE, 'side', 'high' );
}

function audience_ui( WP_Post $post ) {
	if ( $post->post_type !== POST_TYPE ) {
		return;
	}

	echo '<div id="altis-analytics-audience-ui"></div>';
}

function get_event_data_maps() : array {
	global $altis_analytics_event_data_maps;
	return array_values( $altis_analytics_event_data_maps ?: [] );
}

function register_event_data_map( string $field, string $label ) {
	global $altis_analytics_event_data_maps;
	$altis_analytics_event_data_maps = $altis_analytics_event_data_maps ?: [];
	$altis_analytics_event_data_maps[ $field ] = [
		'field' => $field,
		'label' => $label,
	];
	ksort( $altis_analytics_event_data_maps );
}

function admin_enqueue_scripts() {
	wp_enqueue_script(
		'altis-analytics-audience-ui',
		plugins_url( 'build/audiences.js', dirname( __FILE__, 2 ) ),
		[
			'react',
			'react-dom',
			'wp-i18n',
			'wp-hooks',
			'wp-data',
			'wp-components',
		],
		'__AUDIENCE_SCRIPT_HASH__',
		true
	);

	// Register default audience data maps.
	register_event_data_map( 'attributes.referer', __( 'Referrer', 'altis-analytics' ) );
	register_event_data_map( 'endpoint.Demographic.Model', __( 'Browser', 'altis-analytics' ) );
	register_event_data_map( 'endpoint.Demographic.ModelVersion', __( 'Browser version', 'altis-analytics' ) );
	register_event_data_map( 'endpoint.Demographic.Locale', __( 'Browser Locale', 'altis-analytics' ) );
	register_event_data_map( 'endpoint.Demographic.Platform', __( 'Operating system', 'altis-analytics' ) );
	register_event_data_map( 'endpoint.Demographic.PlatformVersion', __( 'Operating system version', 'altis-analytics' ) );
	register_event_data_map( 'endpoint.Location.Country', __( 'Country', 'altis-analytics' ) );

	$maps = get_event_data_maps();

	// TODO: Move this to API endpoint and fetch aggregation by key on demand.
	$query = [
		// 'query' => [
		// 	'filter' => [
		// 		// For the past week.
		// 		[ 'range' => [
		// 			'event_timestamp' => [ 'gte' => intval( microtime( false ) - ( 7 * 24 * 60 * 60 * 1000 ) ) ],
		// 		] ],
		// 	],
		// ],
		'size' => 0,
		'aggs' => [],
		'sort' => [ 'event_timestamp' => 'desc' ],
	];
	foreach ( $maps as $map ) {
		// Query for all the different values available for each.
		$query['aggs'][ $map['field'] ] = [
			'terms' => [
				'field' => "{$map['field']}.keyword",
				'size' => 100,
			],
		];
	}

	$result = query( $query );

	$data = [
		'DataMaps' => $maps,
		'Data' => $result['aggregations'] ?? (object) [],
	];

	wp_add_inline_script(
		'altis-analytics-audience-ui',
		sprintf(
			'window.Altis = window.Altis || {};' .
			'window.Altis.Analytics = window.Altis.Analytics || {};' .
			'window.Altis.Analytics.Audiences = %s;',
			wp_json_encode( $data )
		),
		'before'
	);
}
