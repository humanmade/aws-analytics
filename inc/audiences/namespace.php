<?php
/**
 * Audiences.
 *
 * @package altis-analytics
 */

namespace Altis\Analytics\Audiences;

use function Altis\Analytics\Utils\milliseconds;
use function Altis\Analytics\Utils\query;
use WP_Post;

const POST_TYPE = 'audience';

function setup() {
	add_action( 'init', __NAMESPACE__ . '\\register_post_type' );
	add_action( 'init', __NAMESPACE__ . '\\register_default_event_data_maps' );
	add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\\admin_enqueue_scripts' );
	add_action( 'edit_form_after_title', __NAMESPACE__ . '\\audience_ui' );
	add_action( 'add_meta_boxes_' . POST_TYPE, __NAMESPACE__ . '\\meta_boxes' );

	// Setup Audience REST API.
	add_action( 'rest_api_init', __NAMESPACE__ . '\\REST_API\\init' );
}

/**
 * Setup the audiences data store.
 */
function register_post_type() {
	register_extended_post_type(
		POST_TYPE,
		[
			'public' => false,
			'show_ui' => true,
			'supports' => [ 'title' ],
			'menu_icon' => 'dashicons-groups',
			'menu_position' => 151,
			'show_in_rest' => true,
		],
		[
			'singular' => __( 'Audience', 'altis-analytics' ),
			'plural' => __( 'Audiences', 'altis-analytics' ),
		]
	);
}

/**
 * Set up default event data mappings.
 */
function register_default_event_data_maps() {
	register_event_data_map( 'attributes.referer', __( 'Referrer', 'altis-analytics' ) );
	register_event_data_map( 'endpoint.Demographic.Model', __( 'Browser', 'altis-analytics' ) );
	register_event_data_map( 'endpoint.Demographic.ModelVersion', __( 'Browser version', 'altis-analytics' ) );
	register_event_data_map( 'endpoint.Demographic.Locale', __( 'Browser Locale', 'altis-analytics' ) );
	register_event_data_map( 'endpoint.Demographic.Platform', __( 'Operating system', 'altis-analytics' ) );
	register_event_data_map( 'endpoint.Demographic.PlatformVersion', __( 'Operating system version', 'altis-analytics' ) );
	register_event_data_map( 'endpoint.Location.Country', __( 'Country', 'altis-analytics' ) );
}

function meta_boxes() {
	remove_meta_box( 'submitdiv', POST_TYPE, 'side' );
	remove_meta_box( 'slugdiv', POST_TYPE, 'normal' );

	// Add our replaced submitdiv meta box.
	add_meta_box( 'audience-options', __( 'Options', 'altis-analytics' ), function () {
		echo '<div id="altis-analytics-audience-options"></div>';
	}, POST_TYPE, 'side', 'high' );
}

/**
 * Add Audience UI placeholder.
 *
 * @param WP_Post $post
 * @return void
 */
function audience_ui( WP_Post $post ) {
	if ( $post->post_type !== POST_TYPE ) {
		return;
	}

	echo sprintf(
		'<div id="altis-analytics-audience-ui">%s</div>',
		esc_html__( 'Loading...', 'altis-analytics' )
	);
}

/**
 * Get list of mapped analytics data fields.
 *
 * @return array
 */
function get_event_data_maps() : array {
	global $altis_analytics_event_data_maps;
	return array_values( $altis_analytics_event_data_maps ?: [] );
}

/**
 * Adds an elasticsearch to field data mapping.
 *
 * @param string $field The elasticsearch field name.
 * @param string $label A human readable label for the field.
 * @param array $args Additional meta data for the field mapping.
 */
function register_event_data_map( string $field, string $label, array $args = [] ) {
	global $altis_analytics_event_data_maps;
	$altis_analytics_event_data_maps = $altis_analytics_event_data_maps ?: [];
	$altis_analytics_event_data_maps[ $field ] = [
		'name' => $field,
		'label' => $label,
		'args' => $args,
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
			'wp-api-fetch',
		],
		'__AUDIENCE_SCRIPT_HASH__',
		true
	);

	wp_enqueue_style( 'wp-components' );

	$data = [
		'Fields' => get_field_data() ?? (object) [],
	];

	wp_add_inline_script(
		'altis-analytics-audience-ui',
		sprintf(
			'window.Altis = window.Altis || {};' .
			'window.Altis.Analytics = window.Altis.Analytics || {};' .
			'window.Altis.Analytics.BuildURL = %s;' .
			'window.Altis.Analytics.Audiences = %s;',
			wp_json_encode( plugins_url( 'build/', dirname( __FILE__, 2 ) ) ),
			wp_json_encode( $data )
		),
		'before'
	);
}

/**
 * Get estimated audience size.
 *
 * @param array $audience
 * @return void
 */
function get_estimate( array $audience ) {
}

/**
 * Get a list of mapped fields and some information on the available
 * data for those fields.
 *
 * Example results:
 *
 * [
 *   'endpoint.Location.Country' => [
 *     'label' => 'Country',
 *     'data' => [
 *       [ 'key' => 'GB', 'doc_count' => 281 ],
 *       [ 'key' => 'US', 'doc_count' => 127 ]
 *     ]
 *   ],
 *   'metrics.UserSpend' => [
 *     'label' => 'Total User Spend',
 *     'stats' => [
 *        'sum' => 560,
 *        'min' => 10,
 *        'max' => 210,
 *        'avg' => 35
 *     ]
 *   ]
 * ]
 *
 * @return ?array
 */
function get_field_data() : ?array {
	$maps = get_event_data_maps();

	$key = sprintf( 'field_data_%s', sha1( serialize( wp_list_pluck( $maps, 'name' ) ) ) );
	$cache = wp_cache_get( $key, 'altis-audiences' );
	if ( $cache ) {
		return $cache;
	}

	$query = [
		'query' => [
			'bool' => [
				'filter' => [
					// Query for current site.
					[ 'term' => [ 'attributes.blogId.keyword' => (string) get_current_blog_id() ] ],
					// Last 7 days.
					[ 'range' => [ 'event_timestamp' => [ 'gte' => milliseconds() - ( 7 * 24 * 60 * 60 * 1000 ) ] ] ],
				],
			],
		],
		'size' => 0,
		'aggs' => [],
		'sort' => [ 'event_timestamp' => 'desc' ],
	];

	// Possible numeric fields.
	$numeric_fields = [
		'event_timestamp',
		'session.start_timestamp',
		'session.stop_timestamp',
	];

	foreach ( $maps as $map ) {
		// Check if this is a known numeric value.
		$is_numeric = (
			in_array( $map['name'], $numeric_fields, true ) ||
			stripos( $map['name'], 'metrics' ) !== false
		);

		// For numeric fields get a simple stats aggregation.
		if ( $is_numeric ) {
			$query['aggs'][ $map['name'] ] = [
				'stats' => [
					'field' => $map['name'],
				],
			];
			continue;
		}

		// Default to terms aggregations for top 100 different values available for each field.
		$query['aggs'][ $map['name'] ] = [
			'terms' => [
				'field' => "{$map['name']}.keyword",
				'size' => 100,
			],
		];
	}

	$result = query( $query );

	if ( ! $result ) {
		return $result;
	}

	$aggregations = $result['aggregations'];

	// Normalise aggregations to useful just the useful data.
	$fields = array_map( function ( array $field ) use ( $aggregations ) {
		if ( isset( $aggregations[ $field['name'] ]['buckets'] ) ) {
			$field['data'] = array_map( function ( $bucket ) {
				return [
					'value' => $bucket['key'],
					'count' => $bucket['doc_count'],
				];
			}, $aggregations[ $field['name'] ]['buckets'] );
		} else {
			$field['stats'] = $aggregations[ $field['name'] ];
		}

		unset( $field['args'] );

		return $field;
	}, $maps );

	$fields = array_values( $fields );

	// Cache the data.
	wp_cache_set( $key, $fields, 'altis-audiences', time() + HOUR_IN_SECONDS );

	return $fields;
}
