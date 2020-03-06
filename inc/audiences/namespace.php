<?php
/**
 * Audiences.
 *
 * @package altis-analytics
 */

namespace Altis\Analytics\Audiences;

use function Altis\Analytics\Utils\field_type_is;
use function Altis\Analytics\Utils\get_field_type;
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

	$data = (object) [];

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
function get_estimate( array $audience ) : ?array {
	$query = [
		'query' => [
			'bool' => [
				'filter' => [
					// Set current site.
					[ 'term' => [ 'attributes.blogId.keyword' => get_current_blog_id() ] ],
					// Last 7 days.
					[ 'range' => [ 'event_timestamp' => [ 'gte' => milliseconds() - ( 7 * 24 * 60 * 60 * 1000 ) ] ] ],
					// Limit event type to pageView.
					[ 'term' => [ 'event_type.keyword' => 'pageView' ] ],
				],
			],
		],
		'aggs' => [
			'estimate' => [ 'cardinality' => [ 'field' => 'endpoint.User.UserId.keyword' ] ],
			'histogram' => [
				'histogram' => [
					'field' => 'event_timestamp',
					'interval' => 4 * 60 * 60 * 1000, // 4 hour chunks
					'extended_bounds' => [
						'min' => milliseconds() - ( 7 * 24 * 60 * 60 * 1000 ),
						'max' => milliseconds(),
					],
				],
			],
		],
		'size' => 0,
		'sort' => [ 'event_timestamp' => 'desc' ],
	];

	// Append the groups query.
	$query['query']['bool']['filter'][] = build_audience_query( $audience );

	// TODO: caching.

	$result = query( $query );

	if ( ! $result ) {
		return $result;
	}

	$histogram = array_map( function ( array $bucket ) {
		return [
			'index' => $bucket['key'],
			'count' => $bucket['doc_count'],
		];
	}, $result['aggregations']['histogram']['buckets'] );

	$estimate = [
		'count' => $result['aggregations']['estimate']['value'],
		'histogram' => array_values( $histogram ),
		'total' => get_unique_enpoint_count(),
	];

	return $estimate;
}

/**
 * Get total unique endpoints for the past 7 days.
 *
 * @return integer|null
 */
function get_unique_enpoint_count() : ?int {
	$query = [
		'query' => [
			'bool' => [
				'filter' => [
					// Set current site.
					[ 'term' => [ 'attributes.blogId.keyword' => get_current_blog_id() ] ],
					// Last 7 days.
					[ 'range' => [ 'event_timestamp' => [ 'gte' => milliseconds() - ( 7 * 24 * 60 * 60 * 1000 ) ] ] ],
					// Limit event type to pageView.
					[ 'term' => [ 'event_type.keyword' => 'pageView' ] ],
				],
			],
		],
		'aggs' => [
			'count' => [ 'cardinality' => [ 'field' => 'endpoint.User.UserId.keyword' ] ],
		],
		'size' => 0,
		'sort' => [ 'event_timestamp' => 'desc' ],
	];

	$result = query( $query );

	if ( ! $result ) {
		return $result;
	}

	// TODO: caching.

	return $result['aggregations']['count']['value'];
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

	foreach ( $maps as $map ) {
		// For numeric fields get a simple stats aggregation.
		if ( field_type_is( $map['name'], 'number' ) ) {
			$query['aggs'][ $map['name'] ] = [
				'stats' => [
					'field' => $map['name'],
				],
			];
		}
		// Default to terms aggregations for top 100 different values available for each field.
		if ( field_type_is( $map['name'], 'string' ) ) {
			$query['aggs'][ $map['name'] ] = [
				'terms' => [
					'field' => "{$map['name']}.keyword",
					'size' => 100,
				],
			];
		}
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

/**
 * Convert an audience config array to an Elasticsearch query.
 * The response is designed to be used within a bool filter query eg:
 *
 * $query = [
 *   'query' => [
 *     'bool' => [
 *       'filter' => [
 *         get_filter_query( $audience ),
 *       ]
 *     ]
 *   ]
 * ];
 *
 * @param array $audience
 * @return array
 */
function build_audience_query( array $audience ) : array {
	// Map the include values to elasticsearch query filters.
	$include_map = [
		'any' => 'should',
		'all' => 'filter',
		'none' => 'must_not',
	];

	$group_queries = [];

	foreach ( $audience['groups'] as $group ) {
		$group_include = $include_map[ $group['include'] ];
		$group_query = [
			'bool' => [
				$group_include => [],
			],
		];

		foreach ( $group['rules'] as $rule ) {
			$rule_query = [
				'bool' => [
					'filter' => [],
					'must_not' => [],
				],
			];

			// Handle string comparisons.
			if ( field_type_is( $rule['field'], 'string' ) ) {
				switch ( $rule['operator'] ) {
					case '=':
						$rule_query['bool']['filter'][] = [
							'term' => [ "{$rule['field']}.keyword" => $rule['value'] ],
						];
						break;
					case '!=':
						$rule_query['bool']['must_not'][] = [
							'term' => [ "{$rule['field']}.keyword" => $rule['value'] ],
						];
						break;
					case '*=':
						$rule_query['bool']['filter'][] = [
							'wildcard' => [ "{$rule['field']}.keyword" => "*{$rule['value']}*" ],
						];
						break;
					case '!*':
						$rule_query['bool']['must_not'][] = [
							'wildcard' => [ "{$rule['field']}.keyword" => "*{$rule['value']}*" ],
						];
						break;
				}
			}

			// Handle numeric field comparisons.
			if ( field_type_is( $rule['field'], 'number' ) ) {
				$rule_query['bool']['filter'][] = [
					'range' => [ $rule['field'] => [ $rule['operator'] => intval( $rule['value'] ) ] ],
				];
			}

			// Add the rule query to the group.
			$group_query['bool'][ $group_include ][] = $rule_query;
		}

		// Add the group query to the list of group queries.
		$group_queries[] = $group_query;
	}

	$groups_include = $include_map[ $audience['include'] ];
	$groups_query = [
		'bool' => [
			$groups_include => $group_queries,
		],
	];

	return $groups_query;
}
