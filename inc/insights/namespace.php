<?php
/**
 * Dashboard Analytics
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Insights;

use Altis\Analytics\Blocks;
use Altis\Analytics\Utils;
use WP_Query;

/**
 * Set up the Analytics Insights page.
 */
function setup() {
	// Analytics dashboard view.
	add_action( 'admin_menu', __NAMESPACE__ . '\\register_analytics_page' );

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
					'size' => 10000, // Use arbitrary large size that is more than we're likely to need.
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

	$result = Utils\query( $query, [
		'request_cache' => 'true',
	] );

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
