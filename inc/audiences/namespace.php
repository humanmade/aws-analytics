<?php
/**
 * Audiences.
 *
 * @package altis-analytics
 */

namespace Altis\Analytics\Audiences;

use Altis\Analytics\Utils;
use WP_Post;

const POST_TYPE = 'audience';

function setup() {
	add_action( 'init', __NAMESPACE__ . '\\register_post_type' );
	add_action( 'init', __NAMESPACE__ . '\\register_default_event_data_maps' );
	add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\\admin_enqueue_scripts' );
	add_action( 'edit_form_top', __NAMESPACE__ . '\\audience_ui' );
	add_action( 'add_meta_boxes_' . POST_TYPE, __NAMESPACE__ . '\\meta_boxes' );
	add_action( 'save_post_' . POST_TYPE, __NAMESPACE__ . '\\save_post', 10, 2 );
	add_filter( 'post_row_actions', __NAMESPACE__ . '\\remove_quick_edit', 10, 2 );
	add_filter( 'bulk_actions-edit-' . POST_TYPE, __NAMESPACE__ . '\\remove_bulk_actions' );

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
			'supports' => false,
			'menu_icon' => 'dashicons-groups',
			'menu_position' => 151,
			'show_in_rest' => true,
			'rest_base' => 'audiences',
			'hierarchical' => false,
			'admin_cols' => [
				'active' => [
					'title' => __( 'Status', 'altis-analytics' ),
					'function' => function () {
						$post = $GLOBALS['post'];
						if ( $post->post_status === 'publish' ) {
							esc_html_e( 'Active', 'altis-analytics' );
						} else {
							esc_html_e( 'Inactive', 'altis-analytics' );
						}
					},
				],
				'estimate' => [
					'title' => __( 'Size', 'altis-analytics' ),
					'function' => function () {
						estimate_ui( $GLOBALS['post'] );
					},
				],
				'last_modified' => [
					'title' => __( 'Last Modified', 'altis-analytics' ),
					'post_field' => 'post_modified',
				],
			],
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
	register_field( 'attributes.referer', __( 'Referrer', 'altis-analytics' ) );
	register_field( 'endpoint.Demographic.Model', __( 'Browser', 'altis-analytics' ) );
	register_field( 'endpoint.Demographic.ModelVersion', __( 'Browser version', 'altis-analytics' ) );
	register_field( 'endpoint.Demographic.Locale', __( 'Browser Locale', 'altis-analytics' ) );
	register_field( 'endpoint.Demographic.Platform', __( 'Operating system', 'altis-analytics' ) );
	register_field( 'endpoint.Demographic.PlatformVersion', __( 'Operating system version', 'altis-analytics' ) );
	register_field( 'endpoint.Location.Country', __( 'Country', 'altis-analytics' ) );
}

function meta_boxes() {
	remove_meta_box( 'submitdiv', POST_TYPE, 'side' );
	remove_meta_box( 'slugdiv', POST_TYPE, 'normal' );
}

/**
 * Add Audience UI placeholder.
 *
 * @param WP_Post $post
 */
function audience_ui( WP_Post $post ) {
	if ( $post->post_type !== POST_TYPE ) {
		return;
	}

	printf(
		'<div id="altis-analytics-audience-ui" data-post-id="%d" data-audience="%s" data-fields="%s">' .
		'<p class="loading"><span class="spinner is-active"></span> %s</p>' .
		'<noscript><div class="error msg">%s</div></noscript>' .
		'</div>',
		$post->ID,
		esc_attr( wp_json_encode( get_audience( $post->ID ) ) ),
		esc_attr( wp_json_encode( get_field_data() ) ),
		esc_html__( 'Loading...', 'altis-analytics' ),
		esc_html__( 'Javascript is required to use the audience editor.', 'altis-analytics' )
	);
}

/**
 * Add estimate UI placeholder.
 *
 * @param WP_Post $post
 */
function estimate_ui( WP_Post $post ) {
	if ( $post->post_type !== POST_TYPE ) {
		return;
	}

	$audience = get_audience( $post->ID );

	printf(
		'<div class="altis-analytics-audience-estimate" data-audience="%s">' .
		'<p class="loading"><span class="spinner is-active"></span> %s</p>' .
		'<noscript>%s</noscript>' .
		'</div>',
		esc_attr( wp_json_encode( $audience ) ),
		esc_html__( 'Loading...', 'altis-analytics' ),
		// translators: %d is the number of visitors matching the audience
		sprintf( esc_html__( '%d visitors in the last 7 days', 'altis-analytics' ), $audience['count'] ?? 0 )
	);
}

/**
 * Support saving the audience configuration the old school way.
 *
 * @param int $post_id The current audience post ID.
 */
function save_post( $post_id ) {
	if ( ! isset( $_POST['audience'] ) ) {
		return;
	}

	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}

	if ( ! is_array( $_POST['audience'] ) ) {
		return;
	}

	save_audience( $post_id, $_POST['audience'] );
}

/**
 * Saves an audience config to the given post ID.
 *
 * @param integer $post_id The post ID to save the audience to.
 * @param array $audience The audience configuration.
 * @return bool True on successful update or false on failure.
 */
function save_audience( int $post_id, array $audience ) : bool {
	// Clear errors.
	delete_post_meta( $post_id, 'audience_error' );

	// Validate using audience schema.
	$valid = rest_validate_value_from_schema( $audience, REST_API\get_audience_schema(), 'audience' );

	if ( is_wp_error( $valid ) ) {
		update_post_meta( $post_id, 'audience_error', $valid->get_error_message() );
		return false;
	}

	// Save the audience configuration.
	return (bool) update_post_meta( $post_id, 'audience', wp_slash( $audience ) );
}

/**
 * Remove quick edit inline action.
 *
 * @param array $actions Inline actions array.
 * @param WP_Post $post The current post.
 * @return array
 */
function remove_quick_edit( array $actions, WP_Post $post ) : array {
	if ( $post->post_type !== POST_TYPE ) {
		return $actions;
	}

	unset( $actions['inline hide-if-no-js'] );
	return $actions;
}

/**
 * Removes the quick edit bulk action.
 *
 * @param array $actions Bulk actions array.
 * @return array
 */
function remove_bulk_actions( array $actions ) : array {
	unset( $actions['edit'] );
	return $actions;
}

/**
 * Get the audience configuration data.
 *
 * @param int $post_id
 * @return array|null
 */
function get_audience( int $post_id ) : ?array {
	return wp_unslash( get_post_meta( $post_id, 'audience', true ) ?: null );
}

/**
 * Get list of mapped analytics data fields.
 *
 * @return array
 */
function get_fields() : array {
	global $altis_analytics_event_data_maps;
	return array_values( $altis_analytics_event_data_maps ?: [] );
}

/**
 * Adds an elasticsearch to field data mapping.
 *
 * @param string $field The elasticsearch field name.
 * @param string $label A human readable label for the field.
 */
function register_field( string $field, string $label ) {
	global $altis_analytics_event_data_maps;
	if ( empty( $altis_analytics_event_data_maps ) ) {
		$altis_analytics_event_data_maps = [];
	}

	$altis_analytics_event_data_maps[ $field ] = [
		'name' => $field,
		'label' => $label,
		'type' => Utils\get_field_type( $field ),
	];
	ksort( $altis_analytics_event_data_maps );
}

/**
 * Queue up the audience admin UI scripts.
 */
function admin_enqueue_scripts() {
	if ( get_current_screen()->post_type !== POST_TYPE ) {
		return;
	}

	wp_dequeue_script( 'post' );

	wp_enqueue_script(
		'altis-analytics-audience-ui',
		Utils\get_asset_url( 'audiences.js' ),
		[
			'react',
			'react-dom',
			'wp-i18n',
			'wp-hooks',
			'wp-data',
			'wp-components',
			'wp-api-fetch',
		],
		null,
		true
	);

	wp_enqueue_style( 'wp-components' );

	// Hydrate with data to speed up the front end.
	$data = [
		'Fields' => get_field_data(),
	];

	// Add post data server side to load front end quickly on legacy edit screens.
	if ( isset( $_GET['post'] ) ) {
		$response = rest_do_request( sprintf( '/wp/v2/audiences/%d', $_GET['post'] ) );
		$data['Current'] = $response->get_data();
		// Calling the rest function triggers the `rest_api_init` action
		// where we reinstate title support. It's removed to provide a clean
		// legacy postedit screen.
		remove_post_type_support( POST_TYPE, 'title' );
	}

	wp_add_inline_script(
		'altis-analytics-audience-ui',
		sprintf(
			'window.Altis = window.Altis || {};' .
			'window.Altis.Analytics = window.Altis.Analytics || {};' .
			'window.Altis.Analytics.BuildURL = %s;' .
			'window.Altis.Analytics.Audiences = %s;',
			wp_json_encode( plugins_url( 'build', dirname( __FILE__, 2 ) ) ),
			wp_json_encode( (object) $data )
		),
		'before'
	);

	wp_enqueue_style(
		'altis-analytics-audience-ui',
		plugins_url( 'src/audiences/index.css', dirname( __FILE__, 2 ) ),
		[],
		'2020-03-19-1'
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
					[ 'range' => [ 'event_timestamp' => [ 'gte' => Utils\milliseconds() - ( WEEK_IN_SECONDS * 1000 ) ] ] ],
					// Limit event type to pageView.
					[ 'term' => [ 'event_type.keyword' => 'pageView' ] ],
				],
			],
		],
		'aggs' => [
			'estimate' => [ 'cardinality' => [ 'field' => 'endpoint.Id.keyword' ] ],
			'histogram' => [
				'histogram' => [
					'field' => 'event_timestamp',
					'interval' => 6 * HOUR_IN_SECONDS * 1000, // 6 hour chunks.
					'extended_bounds' => [
						'min' => Utils\milliseconds() - ( WEEK_IN_SECONDS * 1000 ),
						'max' => Utils\milliseconds(),
					],
				],
			],
		],
		'size' => 0,
		'sort' => [ 'event_timestamp' => 'desc' ],
	];

	// Append the groups query.
	$query['query']['bool']['filter'][] = build_audience_query( $audience );

	$key = sprintf( 'estimate:%s', sha1( serialize( $audience ) ) );
	$cache = wp_cache_get( $key, 'altis-audiences' );
	if ( $cache ) {
		return $cache;
	}

	$result = Utils\query( $query );

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
		'total' => get_unique_endpoint_count(),
		'histogram' => array_values( $histogram ),
	];

	wp_cache_set( $key, $estimate, 'altis-audiences', HOUR_IN_SECONDS );

	return $estimate;
}

/**
 * Get total unique endpoints for the past 7 days.
 *
 * @return integer|null
 */
function get_unique_endpoint_count() : ?int {
	$query = [
		'query' => [
			'bool' => [
				'filter' => [
					// Set current site.
					[ 'term' => [ 'attributes.blogId.keyword' => get_current_blog_id() ] ],
					// Last 7 days.
					[ 'range' => [ 'event_timestamp' => [ 'gte' => Utils\milliseconds() - ( WEEK_IN_SECONDS * 1000 ) ] ] ],
					// Limit event type to pageView.
					[ 'term' => [ 'event_type.keyword' => 'pageView' ] ],
				],
			],
		],
		'aggs' => [
			'count' => [ 'cardinality' => [ 'field' => 'endpoint.Id.keyword' ] ],
		],
		'size' => 0,
		'sort' => [ 'event_timestamp' => 'desc' ],
	];

	$cache = wp_cache_get( 'total-uniques', 'altis-audiences' );
	if ( $cache ) {
		return $cache;
	}

	$result = Utils\query( $query );

	if ( ! $result ) {
		return $result;
	}

	$count = intval( $result['aggregations']['count']['value'] );

	wp_cache_set( 'total-uniques', $count, 'altis-audiences', HOUR_IN_SECONDS );

	return $count;
}

/**
 * Get a list of mapped fields and some information on the available
 * data for those fields.
 *
 * Example results:
 *
 * [
 *   [
 *     'name' => 'endpoint.Location.Country',
 *     'label' => 'Country',
 *     'type' => 'string',
 *     'data' => [
 *       [ 'key' => 'GB', 'doc_count' => 281 ],
 *       [ 'key' => 'US', 'doc_count' => 127 ]
 *     ]
 *   ],
 *   [
 *     'name' => 'metrics.UserSpend',
 *     'label' => 'Total User Spend',
 *     'type' => 'number',
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
	$maps = get_fields();

	$key = sprintf( 'fields:%s', sha1( serialize( wp_list_pluck( $maps, 'name' ) ) ) );
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
					[ 'range' => [ 'event_timestamp' => [ 'gte' => Utils\milliseconds() - ( WEEK_IN_SECONDS * 1000 ) ] ] ],
				],
			],
		],
		'size' => 0,
		'aggs' => [],
		'sort' => [ 'event_timestamp' => 'desc' ],
	];

	foreach ( $maps as $map ) {
		// For numeric fields get a simple stats aggregation.
		if ( Utils\get_field_type( $map['name'] ) === 'number' ) {
			$query['aggs'][ $map['name'] ] = [
				'stats' => [
					'field' => $map['name'],
				],
			];
		}
		// Default to terms aggregations for top 100 different values available for each field.
		if ( Utils\get_field_type( $map['name'] ) === 'string' ) {
			$query['aggs'][ $map['name'] ] = [
				'terms' => [
					'field' => "{$map['name']}.keyword",
					'size' => 100,
				],
			];
		}
	}

	$result = Utils\query( $query );

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
		return $field;
	}, $maps );

	$fields = array_values( $fields );

	// Cache the data.
	wp_cache_set( $key, $fields, 'altis-audiences', HOUR_IN_SECONDS );

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
			if ( Utils\get_field_type( $rule['field'] ) === 'string' ) {
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
					case '^=':
						$rule_query['bool']['filter'][] = [
							'wildcard' => [ "{$rule['field']}.keyword" => "{$rule['value']}*" ],
						];
						break;
				}
			}

			// Handle numeric field comparisons.
			if ( Utils\get_field_type( $rule['field'] ) === 'number' ) {
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
