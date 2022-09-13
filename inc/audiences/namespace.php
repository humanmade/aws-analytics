<?php
/**
 * Audiences.
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Audiences;

use Altis\Analytics\Utils;
use WP_Query;

const COMPARISON_OPERATORS = [
	'=',
	'!=',
	'*=',
	'!*',
	'^=',
	'gte',
	'lte',
	'gt',
	'lt',
];
const POST_TYPE = 'audience';

/**
 * Set up the Audiences UI and backend.
 */
function setup() {
	add_action( 'init', __NAMESPACE__ . '\\register_post_type' );
	add_action( 'init', __NAMESPACE__ . '\\register_default_event_data_maps' );
	add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\\register_scripts', 1 );
	add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\\admin_enqueue_scripts' );
	add_action( 'save_post_' . POST_TYPE, __NAMESPACE__ . '\\save_post', 10, 2 );
	add_action( 'admin_footer', __NAMESPACE__ . '\\modal_portal' );
	add_action( 'admin_menu', __NAMESPACE__ . '\\admin_page' );

	// Create fallback for capabilities.
	if ( ! defined( 'ALTIS_ANALYTICS_FALLBACK_CAPS' ) || ALTIS_ANALYTICS_FALLBACK_CAPS ) {
		add_filter( 'user_has_cap', __NAMESPACE__ . '\\maybe_grant_caps', 1 );
	}

	// Set menu order to minimum value when creating an audience.
	add_filter( 'wp_insert_post_data', __NAMESPACE__ . '\\set_menu_order', 10, 2 );

	// Default audience sorting query.
	add_action( 'pre_get_posts', __NAMESPACE__ . '\\pre_get_posts' );

	// Set up Audience REST API.
	add_action( 'rest_api_init', __NAMESPACE__ . '\\REST_API\\init' );

}

/**
 * Set up the audiences data store.
 */
function register_post_type() {
	register_extended_post_type(
		POST_TYPE,
		[
			'public' => false,
			'show_ui' => false,
			'supports' => [
				'title',
				'excerpt',
				'page-attributes',
				'revisions',
			],
			'menu_icon' => 'dashicons-groups',
			'menu_position' => 151,
			'show_in_rest' => true,
			'rest_controller_class' => __NAMESPACE__ . '\\REST_API\\Posts_Controller',
			'rest_base' => 'audiences',
			'hierarchical' => false,
			'capability_type' => [
				'audience',
				'audiences',
			],
			'map_meta_cap' => true,
		],
		[
			'singular' => __( 'Audience', 'altis-analytics' ),
			'plural' => __( 'Audiences', 'altis-analytics' ),
		]
	);
}

/**
 * Filters the user capabilities to grant the audience capabilities.
 *
 * Users who are able to edit pages will be able to edit audiences, unless
 * their role has explicitly had the capabilities removed.
 *
 * @since 4.9.0
 *
 * @param bool[] $allcaps An array of all the user's capabilities.
 * @return bool[] Filtered array of the user's capabilities.
 */
function maybe_grant_caps( $allcaps ) {
	$cap_map = [
		'edit_audiences' => 'edit_pages',
		'edit_others_audiences' => 'edit_others_pages',
		'publish_audiences' => 'publish_pages',
		'read_private_audiences' => 'read_private_pages',
		'delete_audiences' => 'delete_pages',
		'delete_private_audiences' => 'delete_private_pages',
		'delete_published_audiences' => 'delete_published_pages',
		'delete_others_audiences' => 'delete_others_pages',
		'edit_private_audiences' => 'edit_private_pages',
		'edit_published_audiences' => 'edit_published_pages',
	];

	foreach ( $cap_map as $cap => $fallback ) {
		// If the user doesn't have an explicit cap, use the capability set
		// as a fallback.
		if ( ! isset( $allcaps[ $cap ] ) && isset( $allcaps[ $fallback ] ) ) {
			$allcaps[ $cap ] = $allcaps[ $fallback ];
		}
	}

	return $allcaps;
}

/**
 * Sort audiences according to menu order (priority) by default.
 *
 * @param WP_Query $query The current query object.
 */
function pre_get_posts( WP_Query $query ) {
	// Must be an exact query for the audiences post type.
	if ( $query->get( 'post_type' ) !== POST_TYPE ) {
		return;
	}

	// Respect existing orderby settings.
	if ( $query->get( 'orderby' ) ) {
		return;
	}

	$query->set( 'orderby', [
		'menu_order' => 'ASC',
		'post_title' => 'ASC',
	] );
}

/**
 * Set up default event data mappings.
 */
function register_default_event_data_maps() {
	// Traffic source data.
	register_field( 'endpoint.Attributes.initialReferer', __( 'First Referrer', 'altis-analytics' ), [
		'column' => 'endpoint_attributes[\'initialRefere\']',
		'description' => __( 'The first external website a visitor arrived from', 'altis-analytics' ),
	] );
	register_field( 'endpoint.Attributes.referer', __( 'Referrer', 'altis-analytics' ), [
		'column' => 'endpoint_attributes[\'referer\']',
		'description' => __( 'Any external website a visitor has ever arrived from', 'altis-analytics' ),
	] );
	register_field( 'attributes.referer', __( 'Current Referrer', 'altis-analytics' ), [
		'column' => 'attributes[\'referer\']',
		'description' => __( 'The previous URL a visitor came from for the current page view only', 'altis-analytics' ),
	] );

	// Device data.
	register_field( 'endpoint.Demographic.Model', __( 'Browser', 'altis-analytics' ), [
		'column' => 'model',
	] );
	register_field( 'endpoint.Demographic.ModelVersion', __( 'Browser version', 'altis-analytics' ), [
		'column' => 'model_version',
	] );
	register_field( 'endpoint.Demographic.Locale', __( 'Browser Locale', 'altis-analytics' ), [
		'column' => 'locale',
	] );
	register_field( 'endpoint.Demographic.Platform', __( 'Operating system', 'altis-analytics' ), [
		'column' => 'platform',
	] );
	register_field( 'endpoint.Demographic.PlatformVersion', __( 'Operating system version', 'altis-analytics' ), [
		'column' => 'platform_version',
	] );

	// Location data.
	register_field( 'endpoint.Location.Country', __( 'Country', 'altis-analytics' ), [
		'column' => 'country',
		'options' => '\\Altis\\Analytics\\Utils\\get_countries',
		'disable_free_text' => true,
	] );

	// UTM Campaign parameters.
	register_field( 'endpoint.Attributes.initial_utm_campaign', __( 'First UTM Campaign', 'altis-analytics' ), [
		'column' => 'endpoint_attributes[\'initial_utm_campaign\']',
	] );
	register_field( 'endpoint.Attributes.initial_utm_source', __( 'First UTM Source', 'altis-analytics' ), [
		'column' => 'endpoint_attributes[\'initial_utm_source\']',
	] );
	register_field( 'endpoint.Attributes.initial_utm_medium', __( 'First UTM Medium', 'altis-analytics' ), [
		'column' => 'endpoint_attributes[\'initial_utm_medium\']',
	] );
	register_field( 'endpoint.Attributes.initial_utm_term', __( 'First UTM Term', 'altis-analytics' ), [
		'column' => 'endpoint_attributes[\'initial_utm_term\']',
	] );
	register_field( 'endpoint.Attributes.initial_utm_content', __( 'First UTM Content', 'altis-analytics' ), [
		'column' => 'endpoint_attributes[\'initial_utm_content\']',
	] );
	register_field( 'endpoint.Attributes.utm_campaign', __( 'UTM Campaign', 'altis-analytics' ), [
		'column' => 'endpoint_attributes[\'utm_campaign\']',
	] );
	register_field( 'endpoint.Attributes.utm_source', __( 'UTM Source', 'altis-analytics' ), [
		'column' => 'endpoint_attributes[\'utm_source\']',
	] );
	register_field( 'endpoint.Attributes.utm_medium', __( 'UTM Medium', 'altis-analytics' ), [
		'column' => 'endpoint_attributes[\'utm_medium\']',
	] );
	register_field( 'endpoint.Attributes.utm_term', __( 'UTM Term', 'altis-analytics' ), [
		'column' => 'endpoint_attributes[\'utm_term\']',
	] );
	register_field( 'endpoint.Attributes.utm_content', __( 'UTM Content', 'altis-analytics' ), [
		'column' => 'endpoint_attributes[\'utm_content\']',
	] );

	// Time based parameters.
	register_field( 'metrics.hour', __( 'Hour', 'altis-analytics' ), [
		'column' => 'metrics[\'hour\']',
		'description' => __( '24 hour clock format. For example 0 = midnight and 18 = 6pm.', 'altis-analytics' ),
	] );
	register_field( 'metrics.day', __( 'Day', 'altis-analytics' ), [
		'column' => 'metrics[\'day\']',
		'description' => __( 'Day of the week by number. 1 = Sunday, 2 = Monday and so on.' ),
	] );
	register_field( 'metrics.month', __( 'Month', 'altis-analytics' ), [
		'column' => 'metrics[\'month\']',
		'description' => __( 'Month by number. 1 = January and 12 = December.', 'altis-analytics' ),
	] );
	register_field( 'metrics.year', __( 'Year', 'altis-analytics' ), [
		'column' => 'metrics[\'year\']',
	] );

	// Sessions & page view counts.
	register_field( 'endpoint.Metrics.sessions', __( 'Sessions', 'altis-analytics' ), [
		'column' => 'endpoint_metrics[\'sessions\']',
		'description' => __( 'Total separate visits per endpoint.', 'altis-analytics' ),
	] );
	register_field( 'endpoint.Metrics.pageViews', __( 'Page views', 'altis-analytics' ), [
		'column' => 'endpoint_metrics[\'pageViews\']',
		'description' => __( 'Total page views across all sessions.', 'altis-analytics' ),
	] );
}

/**
 * Add audience management page.
 *
 * This is a React app placeholder.
 */
function admin_page() {
	add_menu_page(
		__( 'Manage Audiences' ),
		__( 'Audiences' ),
		'edit_audiences',
		POST_TYPE,
		function () {
			printf(
				'<div id="altis-audience-manager">' .
				'<p class="loading"><span class="spinner is-active"></span> %s</p>' .
				'<noscript><div class="error msg">%s</div></noscript>' .
				'</div>',
				esc_html__( 'Loading...', 'altis-analytics' ),
				esc_html__( 'JavaScript is required to use the audience editor.', 'altis-analytics' )
			);
		},
		'dashicons-groups',
		152
	);
}

/**
 * Output markup for the audience picker modal.
 */
function modal_portal() {
	echo '<div id="altis-analytics-audience-modal"></div>';
}

/**
 * Support saving the audience configuration the old school way.
 *
 * @param int $post_id The current audience post ID.
 */
function save_post( $post_id ) {
	if ( ! isset( $_POST['altis_analytics_nonce'] ) ) {
		return;
	}

	if ( ! wp_verify_nonce( $_POST['altis_analytics_nonce'], 'altis-analytics' ) ) {
		return;
	}

	if ( ! isset( $_POST['audience'] ) ) {
		return;
	}

	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}

	if ( ! is_array( $_POST['audience'] ) ) {
		return;
	}

	// phpcs:ignore HM.Security.ValidatedSanitizedInput.InputNotSanitized -- Sanitized in save_audience().
	save_audience( $post_id, wp_unslash( $_POST['audience'] ) );
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
		update_post_meta( $post_id, 'audience_error', wp_slash( $valid->get_error_message() ) );
		return false;
	}

	// Clear the client side audience config cache returned by get_audience_config().
	wp_cache_delete( 'audiences', 'altis.analytics' );

	// Set audience version.
	update_post_meta( $post_id, 'audience_version', 2 );

	// Save the audience configuration.
	return (bool) update_post_meta( $post_id, 'audience', wp_slash( $audience ) );
}

/**
 * Ensure the menu order value at the top when the audience is created.
 *
 * @param array $data The derived data so far before inserting the post.
 * @param array $postarr The $_POST array data.
 * @return array The modified data for creating the post.
 */
function set_menu_order( array $data, array $postarr ) : array {
	global $wpdb;

	// Don't do anything if this is an update.
	if ( ! empty( $postarr['ID'] ) ) {
		return $data;
	}

	// Check the post type we're creating.
	if ( $data['post_type'] !== POST_TYPE ) {
		return $data;
	}

	// Find the lowest sort order value for audiences.
	$min_order = $wpdb->get_col( $wpdb->prepare(
		"SELECT MIN(menu_order) FROM {$wpdb->posts} WHERE post_type = %s;",
		POST_TYPE
	) );

	// Menu order is the lowest minus 1 so it comes up top.
	$data['menu_order'] = intval( $min_order[0] ?? 0 ) - 1;

	return $data;
}

/**
 * Get the audience configuration data.
 *
 * @param int $post_id Audience post ID.
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
	return $altis_analytics_event_data_maps ?: [];
}

/**
 * Adds a database to field data mapping.
 *
 * @param string $field The field name.
 * @param string $label A human readable label for the field.
 * @param array $options An optional object with further field attributes.
 */
function register_field( string $field, string $label, array $options = [] ) {
	global $altis_analytics_event_data_maps;
	if ( empty( $altis_analytics_event_data_maps ) ) {
		$altis_analytics_event_data_maps = [];
	}

	$altis_analytics_event_data_maps[ $field ] = [
		'name' => $field,
		'label' => $label,
		'type' => Utils\get_field_type( $field ),
		'options' => $options,
	];

	ksort( $altis_analytics_event_data_maps );
}

/**
 * Register resuable scripts.
 */
function register_scripts() {
	wp_register_script(
		'altis-analytics-audience-data',
		Utils\get_asset_url( 'audiences/data.js' ),
		[
			'wp-data',
			'wp-api-fetch',
			'wp-url',
		],
		null,
		true
	);

	wp_register_script(
		'altis-analytics-audience-ui',
		Utils\get_asset_url( 'audiences/ui.js' ),
		[
			'lodash',
			'react',
			'react-dom',
			'altis-analytics-audience-data',
			'wp-core-data',
			'wp-i18n',
			'wp-hooks',
			'wp-components',
			'wp-compose',
			'wp-html-entities',
		],
		null,
		true
	);

	wp_add_inline_script(
		'altis-analytics-audience-ui',
		sprintf(
			'window.Altis = window.Altis || {};' .
			'window.Altis.Analytics = window.Altis.Analytics || {};' .
			'window.Altis.Analytics.BuildURL = %s;' .
			'window.Altis.Analytics.Audiences = %s;',
			wp_json_encode( plugins_url( 'build', dirname( __FILE__, 2 ) ) ),
			wp_json_encode( (object) [] )
		),
		'before'
	);

	wp_register_style(
		'altis-analytics-audience-ui',
		plugins_url( 'src/audiences/index.css', dirname( __FILE__, 2 ) ),
		[ 'wp-components' ],
		'2021-01-22'
	);
}

/**
 * Queue up the audience admin UI scripts.
 */
function admin_enqueue_scripts() {
	// Only queue things up by default on the audience edit pages.
	if ( get_current_screen()->id !== 'toplevel_page_' . POST_TYPE ) {
		return;
	}

	wp_enqueue_script( 'altis-analytics-audience-ui' );
	wp_enqueue_style( 'altis-analytics-audience-ui' );
}

/**
 * Get estimated audience size.
 *
 * @param array $audience Audience configuration array.
 * @return array|null
 */
function get_estimate( array $audience ) : ?array {
	global $wpdb;
	$since = Utils\date_in_milliseconds( '-1 week', DAY_IN_SECONDS );

	$query = [
		'query' => [
			'bool' => [
				'filter' => [
					// Set current site.
					[
						'term' => [
							'attributes.blogId.keyword' => get_current_blog_id(),
						],
					],

					// Last 7 days.
					[
						'range' => [
							'event_timestamp' => [
								'gte' => $since,
							],
						],
					],

					// Limit event type to pageView.
					[
						'term' => [
							'event_type.keyword' => 'pageView',
						],
					],
				],
			],
		],
		'aggs' => [
			'estimate' => [
				'cardinality' => [
					'field' => 'endpoint.Id.keyword',
				],
			],
			'histogram' => [
				'histogram' => [
					'field' => 'event_timestamp',
					'interval' => 6 * HOUR_IN_SECONDS * 1000, // 6 hour chunks.
					'extended_bounds' => [
						'min' => $since,
						'max' => Utils\milliseconds(),
					],
				],
			],
		],
		'size' => 0,
		'sort' => [
			'event_timestamp' => 'desc',
		],
	];

	// Append the groups query.
	$audience_where = build_audience_query( $audience );

	$query = $wpdb->prepare(
		"SELECT uniqCombined64(endpoint_id) as uniques, histogram(42)(toUnixTimestamp64Milli(event_timestamp)) as `histogram`
			FROM analytics
			WHERE
				attributes['blogId'] = %s AND event_type = 'pageView'
				AND event_timestamp >= toDateTime(intDiv(%d,1000))
				AND {$audience_where}",
		get_current_blog_id(),
		$since
	);

	$key = sprintf( 'estimate:%s', sha1( serialize( $audience ) ) );
	$cache = wp_cache_get( $key, 'altis-audiences' );
	if ( $cache ) {
		// return $cache;
	}

	$unique_count = get_unique_endpoint_count( $since );
	$result = Utils\clickhouse_query( $query );

	if ( ! $result ) {
		$no_result = [
			'count' => 0,
			'total' => $unique_count,
		];
		wp_cache_set( $key, $no_result, 'altis-audiences', MINUTE_IN_SECONDS );
		return $no_result;
	}

	$histogram = Utils\normalise_clickhouse_histogram( $result->histogram ?? [] );

	// Get number of unique IDs within the audience.
	$estimate_count = intval( $result->uniques );

	$estimate = [
		'count' => $estimate_count,
		// Make absolutely sure that the total audience size is reflected even if the total uniques is out of sync.
		'total' => max( $unique_count, $estimate_count ),
		'histogram' => $histogram,
	];

	wp_cache_set( $key, $estimate, 'altis-audiences', HOUR_IN_SECONDS );

	return $estimate;
}

/**
 * Get total unique endpoints for the past 7 days.
 *
 * @param int $since Minimum date stamp in milliseconds.
 * @param bool $force_update Set to true to ignore the cache.
 * @return integer|null
 */
function get_unique_endpoint_count( int $since = null, bool $force_update = false ) : ?int {
	global $wpdb;

	if ( $since === null ) {
		$since = Utils\date_in_milliseconds( '-1 week', DAY_IN_SECONDS );
	}

	$query = $wpdb->prepare(
		"SELECT uniqCombined64(endpoint_id) as uniques FROM analytics
			WHERE
				event_type = 'pageView' AND
				event_timestamp > toDateTime(intDiv(%d,1000)) AND
				attributes['blogId'] = %s",
		$since,
		get_current_blog_id()
	);

	$key = sprintf( 'total-uniques-%d', $since );
	$cache = wp_cache_get( $key, 'altis-audiences' );
	if ( $cache && ! $force_update ) {
		return $cache;
	}

	$result = Utils\clickhouse_query( $query );

	if ( ! $result ) {
		wp_cache_set( $key, 0, 'altis-audiences', MINUTE_IN_SECONDS );
		return $result;
	}

	$count = intval( $result->uniques );

	wp_cache_set( $key, $count, 'altis-audiences', MINUTE_IN_SECONDS );

	return $count;
}

/**
 * Get a list of mapped fields and some information on the available
 * data for those fields.
 *
 * Example results:
 *
 * [
 *     [
 *         'name' => 'endpoint.Location.Country',
 *         'label' => 'Country',
 *         'type' => 'string',
 *         'data' => [
 *             [ 'val' => 'GB', 'uniques' => 281 ],
 *             [ 'val' => 'US', 'uniques' => 127 ]
 *         ]
 *     ],
 *     [
 *         'name' => 'metrics.UserSpend',
 *         'label' => 'Total User Spend',
 *         'type' => 'number',
 *         'stats' => [
 *             'count' => 42,
 *             'sum' => 560,
 *             'min' => 10,
 *             'max' => 210,
 *             'avg' => 35
 *         ]
 *     ]
 * ]
 *
 * @return array|null
 */
function get_field_data() : ?array {
	global $wpdb;

	$maps = get_fields();

	$key = sprintf( 'fields:%s', sha1( serialize( wp_list_pluck( $maps, 'name' ) ) ) );
	$cache = wp_cache_get( $key, 'altis-audiences' );
	if ( $cache ) {
		return $cache;
	}

	$results = [];

	foreach ( $maps as $map ) {
		if ( ! isset( $map['options']['column'] ) ) {
			continue;
		}

		$column = $map['options']['column'];

		// For numeric fields get a simple stats aggregation.
		if ( Utils\get_field_type( $map['name'] ) === 'number' ) {
			// Select basic stats about the metric.
			$fields = sprintf( 'count(event_type) as `count`, min(%1$s) as min, max(%1$s) as max, avg(%1$s) as avg, sum(%1$s) as sum', $column );
			$query = $wpdb->prepare( "SELECT {$fields} FROM analytics
				WHERE event_timestamp >= toDateTime(intDiv(%d,1000))
					AND attributes['blogId'] = %s
					AND event_type = 'pageView'
				",
				Utils\date_in_milliseconds( '-1 week', DAY_IN_SECONDS ),
				get_current_blog_id()
			);
		}

		// Default to topK aggregation for top 20 different values available for each field.
		if ( Utils\get_field_type( $map['name'] ) === 'string' ) {
			$join = '';
			// Handle array type sub fields with ARRAY JOIN to generate additional rows.
			if ( strpos( $column, '_attributes' ) !== false ) {
				$join = "LEFT ARRAY JOIN {$column} as sub_fields";
				$column = 'sub_fields';
			}

			$fields = sprintf( 'topK(20)(%1$s)[1] as val, count(event_type) as views, uniqCombined64(endpoint_id) as uniques', $column );
			$query = $wpdb->prepare( "SELECT {$fields} FROM analytics
				{$join}
				WHERE event_timestamp >= toDateTime(intDiv(%d,1000))
					AND attributes['blogId'] = %s
					AND event_type = 'pageView'
					GROUP BY {$column}
					HAVING notEmpty(val)
					ORDER BY uniques DESC
				",
				Utils\date_in_milliseconds( '-1 week', DAY_IN_SECONDS ),
				get_current_blog_id()
			);
		}

		$results[ $map['name'] ] = Utils\clickhouse_query( $query );
	}

	$results = array_filter( $results, function ( $result ) {
		return ! is_wp_error( $result );
	} );

	// Get the total uniques to get percentage distribution.
	$total = get_unique_endpoint_count();

	// Normalise aggregations to useful just the useful data.
	$fields = [];
	foreach ( $maps as $field ) {
		$field_name = $field['name'];
		if ( isset( $results[ $field_name ] ) ) {
			// Process string field result.
			if ( Utils\get_field_type( $field_name ) === 'string' ) {
				$options = $field['options']['options'] ?? null;
				if ( is_callable( $options ) ) {
					$options = call_user_func( $options );
				}
				if ( is_array( $options ) ) {
					$buckets = array_combine( array_column( $results[ $field_name ], 'val' ), $results[ $field_name ] );
					$field_data = array_map( function ( $value, $label ) use ( $buckets, $total ) {
						return [
							'value' => $value,
							'label' => $label,
							'count' => $buckets[ $value ]->views ?? 0,
							'percent' => isset( $buckets[ $value ]->uniques ) ? intval( ( $buckets[ $value ]->uniques / $total ) * 100 ) : 0,
						];
					}, array_keys( $options ), $options );
					unset( $field['options']['options'] );
				} else {
					$field_data = array_map( function ( $bucket ) use ( $total ) {
						return [
							'value' => $bucket->val,
							'count' => $bucket->views,
							'percent' => isset( $bucket->uniques ) ? intval( ( $bucket->uniques / $total ) * 100 ) : 0,
						];
					}, $results[ $field_name ] );
				}
				$field['data'] = $field_data;
			} else {
				$field['stats'] = (array) $results[ $field_name ];
			}
		}

		// Cleanup data not needed for front end.
		unset( $field['options']['column'] );
		$fields[] = $field;
	}

	// Cache the data.
	wp_cache_set( $key, $fields, 'altis-audiences', HOUR_IN_SECONDS );

	return $fields;
}

/**
 * Convert an audience config array to an SQL query.
 *
 * @param array $audience Audience configuration array.
 * @return string SQL WHERE clauses component.
 */
function build_audience_query( array $audience ) : string {
	$fields = get_fields();

	// Map the include values to elasticsearch query filters.
	$include_map = [
		'any' => 'OR',
		'all' => 'AND',
		'none' => 'AND NOT',
	];

	$group_queries = [];

	foreach ( $audience['groups'] as $group ) {
		$group_include = $include_map[ $group['include'] ];
		$group_query = [];

		foreach ( $group['rules'] as $rule ) {
			$rule_query = '';

			// Ignore rules with an empty field or no db column name.
			if ( empty( $rule['field'] ) || ! isset( $fields[ $rule['field'] ]['options']['column'] ) ) {
				continue;
			}

			// Handle string comparisons.
			if ( Utils\get_field_type( $rule['field'] ) === 'string' ) {
				switch ( $rule['operator'] ) {
					case '=':
						$rule_query .= "= '{$rule['value']}'";
						break;
					case '!=':
						$rule_query .= "!= '{$rule['value']}'";
						break;
					case '*=':
						$rule_query .= "LIKE '*{$rule['value']}*'";
						break;
					case '!*':
						$rule_query .= "NOT LIKE '*{$rule['value']}*'";
						break;
					case '^=':
						$rule_query .= "LIKE '{$rule['value']}*'";
						break;
				}
			}

			// Handle numeric field comparisons.
			if ( Utils\get_field_type( $rule['field'] ) === 'number' ) {
				switch ( $rule['operator'] ) {
					case '=':
						$rule_query .= "= {$rule['value']}";
						break;
					case '!=':
						$rule_query .= "!= {$rule['value']}";
						break;
					default:
						$operator = [
							'gt' => '>',
							'gte' => '>=',
							'lt' => '<',
							'lte' => '<=',
						][ $rule['operator'] ] ?? '=';
						$rule_query .= "{$operator} {$rule['value']}";
				}
			}

			// Add the rule query to the group.
			if ( ! empty( $rule_query ) ) {
				$group_query[] = sprintf(
					'%s %s',
					$fields[ $rule['field'] ]['options']['column'],
					$rule_query
				);
			}
		}

		// Add the group query to the list of group queries.
		$group_queries[] = sprintf( ' (%s) ', implode( $group_include, $group_query ) );
	}

	$groups_include = $include_map[ $audience['include'] ];
	$groups_query = sprintf( ' (%s) ', implode( $groups_include, $group_queries ) );

	return $groups_query;
}

/**
 * Query audience posts.
 *
 * @param array|null $args Query arguments to pass to WP_Query.
 * @return array
 */
function query_audiences( $args = null ) {
	/**
	 * Limits the number of active audiences there can be in use at any one time
	 * on the front end.
	 *
	 * @param int $limit The number of audiences to fetch for use client side.
	 */
	$limit = apply_filters( 'altis.analytics.audiences.limit', 20 );

	// Prevent negative values, -1 in this case means an unbounded query.
	$limit = absint( $limit );

	$args = wp_parse_args( $args, [
		'no_found_rows' => true,
		'order' => 'ASC',
		'orderby' => 'menu_order',
		'post_status' => 'publish',
		'post_type' => POST_TYPE,
		'posts_per_page' => $limit,
	] );

	$audiences = new WP_Query( $args );
	return $audiences->posts;
}

/**
 * Returns audience configuration data array for client side use.
 *
 * @return array
 */
function get_audience_config() : array {
	// Note this cache is cleared in save_audience().
	$config = wp_cache_get( 'audiences', 'altis.analytics' );

	if ( $config ) {
		return $config;
	}

	// Get the audience config from post meta for each post.
	$audiences = query_audiences( [
		'fields' => 'ids',
	] );
	$config = [];
	foreach ( $audiences as $audience_id ) {
		$config[] = [
			'id' => $audience_id,
			'config' => get_audience( $audience_id ),
		];
	}

	wp_cache_set( 'audiences', $config, 'altis.analytics' );

	return $config;
}
