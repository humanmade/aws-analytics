<?php
/**
 * Dashboard Analytics
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Dashboard;

use Altis;
use Altis\Analytics\Blocks;
use Altis\Analytics\Utils;
use WP_Error;
use WP_Post_Type;
use WP_Query;

const API_NAMESPACE = 'analytics/v1';
const SCRIPT_ID = 'altis-analytics-ui';
const STYLE_ID = 'altis-analytics-ui';

/**
 * Set up the Dashboard Analytics page.
 */
function setup() {
	// Analytics dashboard view.
	API\bootstrap();
	add_action( 'admin_menu', __NAMESPACE__ . '\\register_analytics_page' );

	// Add standard aggs for stats output.
	register_default_aggregations();

	// Experience Insights dashboard.
	add_filter( 'manage_posts_columns', __NAMESPACE__ . '\\remove_default_columns', 10, 2 );
	add_filter( 'page_row_actions', __NAMESPACE__ . '\\remove_post_row_actions', 10, 2 );
	add_filter( 'manage_edit-xb_sortable_columns', __NAMESPACE__ . '\\xb_table_sorting' );
	add_filter( 'request', __NAMESPACE__ . '\\xb_block_column_orderby' );
	add_filter( 'views_edit-xb', __NAMESPACE__ . '\\render_date_range_links' );
	add_filter( 'manage_xb_posts_columns', __NAMESPACE__ . '\\add_microcopy_to_column_titles', 99 );
	add_filter( 'bulk_actions-edit-xb', '__return_empty_array' );
	add_filter( 'months_dropdown_results', __NAMESPACE__ . '\\remove_months_dropdown', 10, 2 );
	add_filter( 'altis.publication-checklist.show_tasks_column', '__return_false' );

	add_action( 'pre_get_posts', __NAMESPACE__ . '\\modify_views_list_query' );
	add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\\enqueue_styles' );

	// Queue up Altis Accelerate Dashboard replacement for standard dashboard.
	if ( ! defined( 'ALTIS_ACCELERATE_DASHBOARD' ) || ALTIS_ACCELERATE_DASHBOARD ) {
		add_action( 'load-index.php', __NAMESPACE__ . '\\load_dashboard' );
	}
}

/**
 * Replace the site dashboard with the Accelerate dashboard.
 *
 * @return void
 */
function load_dashboard() {
	// Don't replace network admin.
	if ( is_network_admin() ) {
		return;
	}

	if ( ! current_user_can( 'edit_posts' ) ) {
		return;
	}

	Utils\enqueue_assets( 'accelerate' );

	add_filter( 'screen_options_show_screen', '__return_false' );

	$user = wp_get_current_user();

	$post_types = array_merge(
		// Trackable post types that do not have their own front end URL.
		[
			get_post_type_object( 'xb' ),
			get_post_type_object( 'wp_block' ),
		],
		get_post_types( [
			'show_in_menu' => true,
			'public' => true,
		], 'objects' )
	);
	$post_types = array_map( function ( WP_Post_Type $post_type ) {
		return [
			'name' => $post_type->name,
			'label' => $post_type->labels->name,
		];
	}, $post_types );

	wp_localize_script( 'altis-analytics-accelerate', 'AltisAccelerateDashboardData', [
		'api_namespace' => API_NAMESPACE,
		'user' => [
			'id' => get_current_user_id(),
			'name' => $user->get( 'display_name' ),
			'canViewAnalytics' => current_user_can( 'manage_options' ),
			'canViewInsights' => current_user_can( 'edit_audiences' ),
		],
		'post_types' => array_values( $post_types ),
	] );

	require_once ABSPATH . 'wp-admin/admin-header.php';
	render_page();
	require_once ABSPATH . 'wp-admin/admin-footer.php';

	exit;
}

/**
 * Adds the analytics UI admin page.
 *
 * @return void
 */
function register_analytics_page() {
	$hook = add_dashboard_page(
		__( 'Altis Analytics', 'altis' ),
		__( 'Analytics', 'altis' ),
		'manage_options',
		'altis-analytics',
		__NAMESPACE__ . '\\render_page'
	);
	add_action( 'load-' . $hook, function () {
		Utils\enqueue_assets( 'dashboard' );
	} );
}

/**
 * Display Accelerate React apps.
 *
 * @return void
 */
function render_page() {
	echo '<div id="altis-analytics-root">';

	if ( Altis\get_environment_type() === 'local' ) {
		echo "<p>Ensure you're running the Webpack server. You may also need to open the script URL directly to accept the SSL certificate.</p>";
	}

	echo '</div>';
}

/**
 * Enqueue styles.
 *
 * @param string $pagenow The page we are currently viewing.
 */
function enqueue_styles( string $pagenow ) {
	// Bail early if we aren't on an edit page.
	if ( $pagenow !== 'edit.php' ) {
		return;
	}

	// Bail if we aren't on the XB edit page, specifically.
	if ( get_query_var( 'post_type' ) !== Blocks\POST_TYPE ) {
		return;
	}

	wp_enqueue_style( 'xb-insights', plugin_dir_url( __FILE__ ) . '/assets/style.css', [], '2021-03-22', 'screen' );
}

/**
 * Remove the default post list columns.
 *
 * @param array $columns An array of columns to filter.
 * @param string $post_type The current post type.
 *
 * @return array The filtered columns array.
 */
function remove_default_columns( $columns, $post_type ) : array {
	// Bail early if we aren't in the right place.
	if ( Blocks\POST_TYPE !== $post_type ) {
		return $columns;
	}

	unset( $columns['title'] );
	unset( $columns['cb'] );

	return $columns;
}

/**
 * Remove the post quick actions.
 *
 * @param array $actions An array of actions that can be done on a single post.
 * @param object $post The WP_Post object
 *
 * @return array The filtered array (empty for xbs).
 */
function remove_post_row_actions( $actions, $post ) : array {
	// Bail early if we aren't in the right place.
	if ( Blocks\POST_TYPE !== $post->post_type ) {
		return $actions;
	}

	unset( $actions['view'] );
	unset( $actions['trash'] );
	unset( $actions['inline hide-if-no-js'] );

	// Change the default edit quick action to link to the originating post the block was created on.
	// This will link to a reusable block if it was saved to one.
	$actions['edit'] = sprintf(
		// Translators: 1: The edit post link, 2: The linked text, 3: The block title.
		'<a href="%1$s">%2$s</a> (%3$s)',
		get_edit_post_link(),
		__( 'Edit original post', 'altis-analytics' ),
		get_the_title( $post->post_parent )
	);

	return $actions;
}

/**
 * Add custom sort by columns.
 *
 * @param array $columns An array of post list columns.
 *
 * @return array The updated array with sortable columns.
 */
function xb_table_sorting( $columns ) : array {
	$columns['block'] = 'block';
	$columns['views'] = 'views';
	$columns['conversion'] = 'conversion';
	$columns['author'] = 'author';
	return $columns;
}

/**
 * Add additional microcopy to column titles.
 *
 * Note: This adds an additional span around the column title as there is no current way to filter the column title span itself.
 *
 * @see https://github.com/WordPress/WordPress/blob/5.7-branch/wp-admin/includes/class-wp-posts-list-table.php#L1049
 *
 * @param array $xb_columns An array of columns for the XB post type.
 *
 * @return array The filtered array of columns.
 */
function add_microcopy_to_column_titles( array $xb_columns ) : array {
	$microcopy = [
		'block' => __( 'List of XBs with associated analytics data from the selected date range', 'altis-analytics' ),
		'type' => __( 'The type of Experience Block', 'altis-analytics' ),
		'views' => __( 'Total unique views of the XBs during the selected date range', 'altis-analytics' ),
		'conversion' => __( 'Conversion rate is calculated as the total unique conversions divided by total unique views of the XB during the selected date range,  expressed as a percentage.', 'altis-analytics' ),
		'author' => __( 'Block author', 'altis-analytics' ),
		'last_modified' => __( 'Block last modified date', 'altis-analytics' ),
	];

	foreach ( $xb_columns as $column => $title ) {
		$xb_columns[ $column ] = '<span title="' . esc_html( $microcopy[ $column ] ) . '">' . esc_html( $title ) . '</span>
			<span class="screen-reader-text">' . esc_html( $microcopy[ $column ] ) . '</span>';
	}

	return $xb_columns;
}

/**
 * Update the Block column's orderby value.
 *
 * This displays the title, but the column is a custom column called "block", so we need to change the orderby value to "title".
 *
 * @param array $vars An array of query variables passed in from the filter.
 *
 * @return array The updated query variables.
 */
function xb_block_column_orderby( $vars ) : array {
	if ( isset( $vars['orderby'] ) && 'block' === $vars['orderby'] ) {
		$vars['orderby'] = 'title';
	}

	return $vars;
}

/**
 * Render links for date range data.
 */
function render_date_range_links() {
	$ranges = [
		[
			'days' => 7,
			'label' => __( '7 days', 'altis-analytics' ),
		],
		[
			'days' => 30,
			'label' => __( '30 days', 'altis-analytics' ),
		],
		[
			'days' => 90,
			'label' => __( '90 days', 'altis-analytics' ),
		],
	];

	$days = get_days_view();
	?>
	<div class="xb-analytics-date-range">
		<?php
		foreach ( $ranges as $current ) {
			// Compare the current days value with the current days value pulled from the url query variables.
			if ( $days === $current['days'] ) {
				$selected = 'selected';
			} else {
				$selected = '';
			}

			printf(
				wp_kses_post( '<a href="%1$s" class="date-range-button %2$s">%3$s</a>' ),
				esc_url_raw( add_query_arg( [ 'days' => $current['days'] ] ) ),
				esc_html( $selected ),
				esc_html( $current['label'] )
			);
		}
		?>
	</div>
	<?php
}

/**
 * Render the block name column data.
 */
function render_block_column() {
	global $post;
	?>
	<strong><a href="<?php echo esc_url_raw( admin_url( '/admin.php?page=xb-analytics&post=' . $post->ID ) ); ?>"><?php echo esc_attr( $post->post_title ); ?></a></strong>
	<?php
}

/**
 * Render the block type column data.
 */
function render_type_column() {
	global $post;
	$type = Blocks\get_block_type( $post );
	echo esc_html( Blocks\get_block_type_label( $type ) );
}

/**
 * Render the views column data.
 */
function render_views() {
	global $post;
	$list = get_views_list( get_days_view() );
	$views = $list[ $post->post_name ]['views'] ?? 0;
	?>
	<div class="post--views"><?php echo number_format_i18n( $views ); ?></div>
	<?php
}

/**
 * Render the conversion rate column data.
 */
function render_conversion_rate() {
	global $post;
	$list = get_views_list( get_days_view() );
	$rate = round( ( $list[ $post->post_name ]['conversion_rate'] ?? 0 ) * 100 );
	?>
	<div class="post--conversion-rate"><?php echo absint( $rate ); ?>%</div>
	<?php
}

/**
 * Return the days url query string.
 *
 * @return int The number of days to show insights for. Defaults to 7.
 */
function get_days_view() : int {
	return isset( $_GET['days'] ) ? wp_unslash( absint( $_GET['days'] ) ) : 7;
}

/**
 * Aggregate and map the data from the ES query.
 *
 * @param array $buckets The ElasticSearch query data.
 *
 * @return array An array of aggregated data.
 */
function get_aggregate_data( array $buckets ) : array {
	$data = [];

	foreach ( $buckets as $block ) {
		$block_id = $block['key'];
		$views = $block['views']['uniques']['value'] ?? 0;
		$conversions = $block['conversions']['uniques']['value'] ?? 0;
		$conversion_rate = $block['conversion_rate']['value'] ?? 0;

		$data[ $block_id ]['views'] = $views;
		$data[ $block_id ]['conversions'] = $conversions;
		$data[ $block_id ]['conversion_rate'] = $conversion_rate;
	}

	return $data;
}

/**
 * Get analytics views list data.
 *
 * @param int $days How many days worth of analytics to fetch. Defaults to 7.
 *
 * @return array The array of list data from ElasticSearch.
 */
function get_views_list( int $days = 7 ) : array {
	$date_start = time() - ( $days * DAY_IN_SECONDS );

	$query = [
		'query' => [
			'bool' => [
				'filter' => [
					[
						// Query from the current site.
						'term' => [
							'attributes.blogId.keyword' => get_current_blog_id(),
						],
					],
					[
						// We're interested in views and conversions.
						'terms' => [
							'event_type.keyword' => [
								'experienceView',
								'conversion',
							],
						],
					],
					[
						// Limit to date range.
						'range' => [
							'event_timestamp' => [
								'gte' => $date_start * 1000,
							],
						],
					],
				],
			],
		],
		'aggs' => [
			'blocks' => [
				'terms' => [
					// Get the block data. This will give us the key for the block, which is stored as the post slug.
					'field' => 'attributes.clientId.keyword',
					'size' => 5000, // Use arbitrary large size that is more than we're likely to need.
				],
				'aggs' => [
					'views' => [
						'filter' => [
							'term' => [
								'event_type.keyword' => 'experienceView',
							],
						],
						'aggs' => [
							'uniques' => [
								'cardinality' => [
									'field' => 'endpoint.Id.keyword',
								],
							],
						],
					],
					'conversions' => [
						'filter' => [
							'term' => [
								'event_type.keyword' => 'conversion',
							],
						],
						'aggs' => [
							'uniques' => [
								'cardinality' => [
									'field' => 'endpoint.Id.keyword',
								],
							],
						],
					],
					'conversion_rate' => [
						'bucket_script' => [
							'buckets_path' => [
								'views' => 'views>uniques',
								'conversions' => 'conversions>uniques',
							],
							'script' => 'params.conversions / params.views',
						],
					],
				],
			],
		],
		'size' => 0,
		'sort' => [
			'event_timestamp' => 'desc',
		],
	];

	$key = sprintf( 'views:list:days:%d', $days );
	$cache = wp_cache_get( $key, 'altis-xbs' );

	if ( $cache ) {
		return $cache;
	}

	$result = Utils\query( $query );

	if ( ! $result ) {
		$data = [];

		wp_cache_set( $key, $data, 'altis-xbs', MINUTE_IN_SECONDS );
		return $data;
	}

	$data = get_aggregate_data( $result['aggregations']['blocks']['buckets'] ?? [] );
	wp_cache_set( $key, $data, 'altis-xbs', 5 * MINUTE_IN_SECONDS );

	return $data;
}

/**
 * Alter the default WP_Query to change the sort order.
 *
 * @param WP_Query $query The WP_Query object.
 * @return void
 */
function modify_views_list_query( WP_Query $query ) {
	// Bail if we aren't looking at the XB Insights page.
	if ( $query->get( 'post_type' ) !== Blocks\POST_TYPE ) {
		return;
	}

	// Bail for queries that aren't ordered by views or conversions (so we don't need to run an ES query).
	if ( ! in_array( $query->get( 'orderby' ), [ 'views', 'conversion' ], true ) ) {
		return;
	}

	$order = $query->get( 'order' ) ?: 'desc';
	$orderby = $query->get( 'orderby' ) ?: 'views';
	$days = $query->get( 'days' ) ?: get_days_view();
	$list = get_views_list( $days );

	// Sort by conversion or views.
	if ( $orderby === 'conversion' ) {
		$orderby .= '_rate';
	}
	$list = Utils\sort_by( $list, $orderby, $order );

	// Pluck the client ids out of the list.
	$client_ids = array_keys( $list );

	// Order by client ID (stored as post slug).
	$query->set( 'post_name__in', $client_ids );
	$query->set( 'orderby', 'post_name__in' );
}

/**
 * Remove the months dropdown for this post type.
 *
 * @param array $months The months data.
 * @param string $post_type The post type.
 * @return array
 */
function remove_months_dropdown( $months, $post_type ) {
	if ( $post_type !== Blocks\POST_TYPE ) {
		return $months;
	}

	return [];
}

/**
 * Add default aggeregations for stats.
 *
 * @return void
 */
function register_default_aggregations() {
	register_term_aggregation( 'device.model.keyword', 'by_browser' );
	register_term_aggregation( 'endpoint.Location.Country.keyword', 'by_country', [
		'parse_result' => function ( $res ) {
			$result = collect_aggregation( $res );
			$keys = array_keys( $result );
			if ( function_exists( 'Altis\\Analytics\\Utils\\get_countries' ) ) {
				$countries = Utils\get_countries();
				$keys = array_map( function ( $code ) use ( $countries ) {
					return $countries[ $code ] ?? __( 'Unknown', 'altis-analytics' );
				}, $keys );
			}
			return array_combine( $keys, array_values( $result ) );
		},
	] );
	register_term_aggregation( 'endpoint.Attributes.DeviceType.keyword', 'by_device' );
	register_term_aggregation( 'device.platform.name.keyword', 'by_os' );
	register_term_aggregation( 'attributes.referer.keyword', 'by_referer', [
		'aggregation' => [
			'filter' => [
				'bool' => [
					'must_not' => [
						[ 'prefix' => [ 'attributes.referer.keyword' => home_url() ] ],
					],
				],
			],
			'aggs' => [
				'referers' => [
					'terms' => [
						'field' => 'attributes.referer.keyword',
					],
				],
			],
		],
		'parse_result' => function ( $res ) {
			$result = collect_aggregation( $res['referers'] );
			if ( isset( $result[''] ) ) {
				$result[ __( 'Direct traffic', 'altis' ) ] = $result[''];
				unset( $result[''] );
			}
			arsort( $result );
			return $result;
		},
	] );
	register_term_aggregation( 'attributes.url.keyword', 'by_url', [
		'parse_result' => function ( $res ) {
			return relativize_urls( home_url(), collect_aggregation( $res ) );
		},
	] );
	register_term_aggregation( 'attributes.search.keyword', 'by_search_term', [
		'aggregation' => [
			'terms' => [
				'field' => 'attributes.search.keyword',
				'min_doc_count' => 1,
				'exclude' => [ '' ],
			],
		],
	] );

	register_term_aggregation( 'endpoint.Attributes.initial_utm_campaign.keyword', 'by_utm_campaign' );
	register_term_aggregation( 'endpoint.Attributes.initial_utm_source.keyword', 'by_utm_source' );
	register_term_aggregation( 'endpoint.Attributes.initial_utm_medium.keyword', 'by_utm_medium' );
	register_term_aggregation( 'endpoint.Attributes.initial_utm_term.keyword', 'by_utm_term' );
	register_term_aggregation( 'endpoint.Attributes.initial_utm_content.keyword', 'by_utm_content' );
}

/**
 * Process a terms aggregation into key value pairs.
 *
 * @param array|null $aggregation A terms aggregation result from Elasticsearch.
 * @return array
 */
function collect_aggregation( ?array $aggregation ) : array {
	if ( empty( $aggregation ) ) {
		return [];
	}
	$data = [];
	foreach ( $aggregation['buckets'] as $bucket ) {
		$data[ $bucket['key'] ] = $bucket['doc_count'];
	}
	return $data;
}

/**
 * Make relative to the current site rather than absolute.
 *
 * @param string $base_url The site's base URL.
 * @param array $data An associative list of URLs and view counts.
 * @return array
 */
function relativize_urls( string $base_url, array $data ) : array {
	$relativized = [];
	$len = strlen( $base_url );
	foreach ( $data as $url => $count ) {
		// Normalize schemes.
		$url = str_replace( [ 'http://', 'https://' ], parse_url( $base_url, PHP_URL_SCHEME ) . '://', $url );
		if ( substr( $url, 0, $len ) === $base_url ) {
			$url = substr( $url, $len );
		}

		if ( empty( $relativized[ $url ] ) ) {
			$relativized[ $url ] = $count;
		} else {
			$relativized[ $url ] += $count;
		}
	}
	return $relativized;
}

/**
 * Add a terms aggregation to the global stats query.
 *
 * @param string $field The field name in the Elasticsearch index.
 * @param string $short_name Short version of the field name for the aggregation.
 * @param array $options Allows modifying the aggregation query result parsing.
 * @return void
 */
function register_term_aggregation( $field, $short_name, $options = [] ) {
	$options = wp_parse_args( $options, [
		'aggregation' => [
			'terms' => [
				'field' => $field,
				'missing' => __( 'Unknown', 'altis' ),
			],
		],
		'parse_result' => __NAMESPACE__ . '\\collect_aggregation',
	] );

	add_filter( 'altis.analytics.ui.graph_aggregations', function ( $aggs ) use ( $short_name, $options ) {
		$aggs[ $short_name ] = $options;
		return $aggs;
	} );
}

/**
 * Get the filter portion of the Elasticsearch queries.
 *
 * @param array $events The events to get results for.
 * @param int $start Start timestamp.
 * @param int $end End timestamp.
 * @param array $aggs Aggregation queries.
 * @param Filter|null $filter Optional query filter object.
 * @return array
 */
function get_query( array $events, int $start, int $end, array $aggs, ?Filter $filter = null ) : array {
	$filter_clause = [
		[
			'terms' => [
				'event_type.keyword' => $events,
			],
		],
		[
			'term' => [
				'attributes.blogId.keyword' => (string) get_current_blog_id(),
			],
		],
		[
			'range' => [
				'event_timestamp' => [
					'gte' => (int) sprintf( '%d000', $start ),
					'lt' => (int) sprintf( '%d999', $end ),
				],
			],
		],
	];

	if ( ! empty( $filter ) ) {
		if ( $filter->path ) {
			$url_path = home_url( $filter->path );
			if ( parse_url( $url_path, PHP_URL_SCHEME ) === 'http' ) {
				$url_path_alt = 'https' . substr( $url_path, 4 );
			} else {
				$url_path_alt = 'http' . substr( $url_path, 5 );
			}
			$filter_clause[] = [
				'bool' => [
					'should' => [
						[
							'term' => [
								'attributes.url.keyword' => $url_path,
							],
						],
						[
							'term' => [
								'attributes.url.keyword' => $url_path_alt,
							],
						],
					],
				],
			];
		}
	}

	$query = [
		'query' => [
			'bool' => [
				'filter' => $filter_clause,
				'must_not' => [],
				'should' => [],
			],
		],
		'size' => 0,
		'aggs' => $aggs,
	];

	return $query;
}

/**
 * Get global page view stats.
 *
 * @param int $start The start timestamp.
 * @param int $end The end timestamp.
 * @param string $resolution Resolution for histogram data.
 * @param Filter|null $filter Query filter object.
 * @return array|WP_error
 */
function get_graph_data( $start, $end, $resolution = 'day', ?Filter $filter = null ) {
	$returning = [
		'filter' => [
			'range' => [
				'endpoint.Metrics.sessions' => [
					'gt' => 1,
				],
			],
		],
		'aggregations' => [
			'user' => [
				'cardinality' => [
					'field' => 'endpoint.Id.keyword',
				],
			],
		],
	];

	$bounce = [
		'range' => [
			'field' => 'endpoint.Metrics.pageViews',
			'keyed' => true,
			'ranges' => [
				[
					'key' => 'single',
					'to' => 2,
				],
				[
					'key' => 'multiple',
					'from' => 2,
				],
			],
		],
		'aggregations' => [
			'user' => [
				'cardinality' => [
					'field' => 'endpoint.Id.keyword',
				],
			],
		],
	];

	$aggs = [
		'views' => [
			'value_count' => [
				'field' => 'event_timestamp',
			],
		],
		'visitors' => [
			'cardinality' => [
				'field' => 'endpoint.Id.keyword',
			],
		],
		'returning' => $returning,
		'bounce' => $bounce,
		'by_date_and_user' => [
			'date_histogram' => [
				'field' => 'event_timestamp',
				'interval' => $resolution,
			],
			'aggregations' => [
				'user' => [
					'cardinality' => [
						'field' => 'endpoint.Id.keyword',
					],
				],
				'returning' => $returning,
				'bounce' => $bounce,
			],
		],
		'by_date_bucket' => [
			'date_histogram' => [
				'field' => 'arrival_timestamp',
				'interval' => $resolution,
			],
		],
	];

	$query = get_query( [ 'pageView' ], $start, $end, $aggs, $filter );

	// Add registered term aggregations.
	$registered_aggs = apply_filters( 'altis.analytics.ui.graph_aggregations', [] );
	foreach ( $registered_aggs as $name => $agg_options ) {
		$query['aggs'][ $name ] = $agg_options['aggregation'];
	}

	$key = sprintf( 'analytics:stats:%s', sha1( serialize( $query ) ) );
	$cache = wp_cache_get( $key, 'altis' );
	if ( $cache ) {
		return $cache;
	}

	$res = Utils\query( $query );

	if ( ! $res ) {
		return new WP_Error( 'analytics.error' );
	}

	if ( ! empty( $res['_shards']['failures'] ) ) {
		$message = $res['_shards']['failures'][0]['reason']['reason'];
		return new WP_Error(
			'analytics.error',
			sprintf( 'Error from Elasticsearch: %s', $message ),
			$res['_shards']['failures']
		);
	}

	$by_interval = [];
	$format = $resolution === 'day' ? 'Y-m-d' : 'c';
	foreach ( $res['aggregations']['by_date_and_user']['buckets'] as $hour ) {
		$date = date( $format, $hour['key'] / 1000 );
		$by_interval[ $date ] = [
			'views' => $hour['doc_count'],
			'visitors' => $hour['user']['value'],
			'returning' => $hour['returning'],
			'bounce' => $hour['bounce'],
		];
	}

	$lift = get_lift( $start, $end, $filter );

	$data = [
		'by_interval' => $by_interval,
		'stats' => [
			'summary' => [
				'views' => $res['aggregations']['views']['value'],
				'visitors' => $res['aggregations']['visitors']['value'],
				'returning' => $res['aggregations']['returning'],
				'bounce' => $res['aggregations']['bounce'],
				'lift' => is_wp_error( $lift ) ? null : $lift,
			],
		],
	];

	foreach ( $registered_aggs as $name => $agg_options ) {
		if ( ! isset( $agg_options['parse_result'] ) ) {
			continue;
		}
		$callback = $agg_options['parse_result'] ?? __NAMESPACE__ . '\\collect_aggregation';
		$data['stats'][ $name ] = call_user_func( $callback, $res['aggregations'][ $name ] );
	}

	wp_cache_set( $key, $data, 'altis', MINUTE_IN_SECONDS );

	return $data;
}

/**
 * Get global aggregated lift.
 *
 * @param int $start Start timestamp.
 * @param int $end End timestamp.
 * @param Filter|null $filter Query filter object.
 * @return array|WP_error
 */
function get_lift( $start, $end, ?Filter $filter = null ) {
	$lift_aggs = [
		'unique' => [ 'cardinality' => [ 'field' => 'endpoint.Id.keyword' ] ],
		'fallback' => [
			'filter' => [ 'term' => [ 'attributes.audience.keyword' => '0' ] ],
			'aggs' => [
				'unique' => [ 'cardinality' => [ 'field' => 'endpoint.Id.keyword' ] ],
			],
		],
		'personalized' => [
			'filter' => [ 'bool' => [ 'must_not' => [ 'term' => [ 'attributes.audience.keyword' => '0' ] ] ] ],
			'aggs' => [
				'unique' => [ 'cardinality' => [ 'field' => 'endpoint.Id.keyword' ] ],
			],
		],
	];

	$aggs = [
		'views' => [
			'filter' => [ 'term' => [ 'event_type.keyword' => 'experienceView' ] ],
			'aggregations' => $lift_aggs,
		],
		'conversions' => [
			'filter' => [ 'term' => [ 'event_type.keyword' => 'conversion' ] ],
			'aggregations' => $lift_aggs,
		],
	];

	$query = get_query(
		[ 'experienceView', 'conversion' ],
		$start,
		$end,
		$aggs,
		$filter
	);

	$key = sprintf( 'analytics:lift:%s', sha1( serialize( $query ) ) );
	$cache = wp_cache_get( $key, 'altis' );
	if ( $cache ) {
		return $cache;
	}

	$res = Utils\query( $query );

	if ( ! $res ) {
		return new WP_Error( 'analytics.error' );
	}

	if ( ! empty( $res['_shards']['failures'] ) ) {
		$message = $res['_shards']['failures'][0]['reason']['reason'];
		return new WP_Error(
			'analytics.error',
			sprintf( 'Error from Elasticsearch: %s', $message ),
			$res['_shards']['failures']
		);
	}

	$response = [
		'views' => $res['aggregations']['views']['unique']['value'],
		'conversions' => $res['aggregations']['conversions']['unique']['value'],
		'fallback' => [
			'views' => $res['aggregations']['views']['fallback']['unique']['value'],
			'conversions' => $res['aggregations']['conversions']['fallback']['unique']['value'],
		],
		'personalized' => [
			'views' => $res['aggregations']['views']['personalized']['unique']['value'],
			'conversions' => $res['aggregations']['conversions']['personalized']['unique']['value'],
		],
	];

	wp_cache_set( $key, $response, 'altis', MINUTE_IN_SECONDS );

	return $response;
}

/**
 * Get global top content data.
 *
 * @param int $start Start timestamp.
 * @param int $end End timestamp.
 * @param Filter|null $filter Query filter object.
 * @return array|WP_Error
 */
function get_top_data( $start, $end, ?Filter $filter = null ) {
	$lift_aggs = [
		'unique' => [ 'cardinality' => [ 'field' => 'endpoint.Id.keyword' ] ],
		'fallback' => [
			'filter' => [ 'term' => [ 'attributes.audience.keyword' => '0' ] ],
			'aggs' => [
				'unique' => [ 'cardinality' => [ 'field' => 'endpoint.Id.keyword' ] ],
			],
		],
		'personalized' => [
			'filter' => [ 'bool' => [ 'must_not' => [ 'term' => [ 'attributes.audience.keyword' => '0' ] ] ] ],
			'aggs' => [
				'unique' => [ 'cardinality' => [ 'field' => 'endpoint.Id.keyword' ] ],
			],
		],
	];

	$aggs = [
		'posts' => [
			'filter' => [
				'term' => [ 'event_type.keyword' => 'pageView' ],
			],
			'aggregations' => [
				'ids' => [
					'terms' => [
						'field' => 'attributes.postId.keyword',
						'size' => 5000,
					],
				],
			],
		],
		'blocks' => [
			'filter' => [
				'terms' => [ 'event_type.keyword' => [ 'experienceView', 'conversion' ] ],
			],
			'aggregations' => [
				'ids' => [
					'terms' => [
						'field' => 'attributes.clientId.keyword',
						'size' => 5000,
					],
					'aggregations' => [
						'views' => [
							'filter' => [ 'term' => [ 'event_type.keyword' => 'experienceView' ] ],
							'aggregations' => $lift_aggs,
						],
						'conversions' => [
							'filter' => [ 'term' => [ 'event_type.keyword' => 'conversion' ] ],
							'aggregations' => $lift_aggs,
						],
					],
				],
			],
		],
	];

	$query = get_query(
		[ 'pageView', 'experienceView', 'conversion' ],
		$start,
		$end,
		$aggs,
		$filter
	);

	$key = sprintf( 'analytics:top:%s', sha1( serialize( $query ) ) );
	$cache = wp_cache_get( $key, 'altis' );
	if ( $cache ) {
		return $cache;
	}

	$res = Utils\query( $query );

	if ( ! $res ) {
		return new WP_Error( 'analytics.error' );
	}

	if ( ! empty( $res['_shards']['failures'] ) ) {
		$message = $res['_shards']['failures'][0]['reason']['reason'];
		return new WP_Error(
			'analytics.error',
			sprintf( 'Error from Elasticsearch: %s', $message ),
			$res['_shards']['failures']
		);
	}

	$posts = $res['aggregations']['posts']['ids']['buckets'] ?? [];
	$blocks = $res['aggregations']['blocks']['ids']['buckets'] ?? [];

	$all = array_merge( $posts, $blocks );
	$all = array_map( function ( $bucket ) {
		$bucket['total'] = $bucket['doc_count'];
		if ( isset( $bucket['views'] ) ) {
			$bucket['total'] = $bucket['views']['doc_count'];
		}
		return $bucket;
	}, $all );

	$all = wp_list_sort( $all, 'total', 'DESC' );

	$processed = [];

	foreach ( $all as $item ) {
		$id = $item['key'];
		if ( ! is_numeric( $item['key'] ) ) {
			$block = Blocks\get_block_post( $item['key'] );
			if ( $block ) {
				$id = $block->ID;
			} else {
				continue;
			}
		}
		$processed[ intval( $id ) ] = $item;
	}

	$query_args = [
		'post_type' => get_post_types( [ 'show_in_menu' => true ] ),
		'post_status' => 'publish',
		'post__in' => array_keys( $processed ),
		'orderby' => 'post__in',
		'order' => 'asc',
		'posts_per_page' => 25,
	];

	if ( ! empty( $filter ) ) {
		if ( $filter->search ) {
			$query_args['s'] = $filter->search;
			unset( $query_args['orderby'] ); // ElasticPress does not support ordering by post__in.
		}
		if ( $filter->type ) {
			$query_args['post_type'] = $filter->type;
		}
		if ( $filter->user ) {
			$query_args['author'] = $filter->user;
		}
		if ( $filter->page ) {
			$query_args['paged'] = $filter->page;
		}
	}

	$query = new WP_Query( $query_args );

	foreach ( $query->posts as $i => $post ) {
		$query->posts[ $i ] = [
			'id' => intval( $post->ID ),
			'slug' => $post->post_name,
			'type' => [
				'name' => $post->post_type,
				'label' => get_post_type_object( $post->post_type )->labels->singular_name,
			],
			'title' => trim( wp_strip_all_tags( get_the_title( $post->ID ) ) ),
			'url' => get_post_type_object( $post->post_type )->public ? get_the_permalink( $post->ID ) : null,
			'editUrl' => get_edit_post_link( $post->ID, 'rest' ),
			'author' => [
				'ID' => intval( $post->post_author ),
				'name' => get_the_author_meta( 'display_name', $post->post_author ),
				'avatar' => get_avatar_url( $post->post_author ),
			],
			'views' => $processed[ $post->ID ]['total'] ?? 0,
		];

		// Get lift.
		if ( isset( $processed[ $post->ID ]['views'], $processed[ $post->ID ]['conversions'] ) ) {
			$query->posts[ $i ]['lift'] = [
				'views' => $processed[ $post->ID ]['views']['unique']['value'],
				'conversions' => $processed[ $post->ID ]['conversions']['unique']['value'],
				'fallback' => [
					'views' => $processed[ $post->ID ]['views']['fallback']['unique']['value'],
					'conversions' => $processed[ $post->ID ]['conversions']['fallback']['unique']['value'],
				],
				'personalized' => [
					'views' => $processed[ $post->ID ]['views']['personalized']['unique']['value'],
					'conversions' => $processed[ $post->ID ]['conversions']['personalized']['unique']['value'],
				],
			];
		}
	}

	$response = [
		'posts' => $query->posts,
		'total' => $query->found_posts,
		'max_pages' => $query->max_num_pages,
	];

	wp_cache_set( $key, $response, 'altis', MINUTE_IN_SECONDS );

	return $response;
}
