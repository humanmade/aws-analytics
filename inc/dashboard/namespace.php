<?php
/**
 * Dashboard Analytics
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Dashboard;

use Altis\Analytics\Blocks;
use Altis\Analytics\Utils;

/**
 * Set up the Dashboard Analytics page.
 */
function setup() {
	add_filter( 'manage_posts_columns', __NAMESPACE__ . '\\remove_default_columns', 10, 2 );
	add_filter( 'page_row_actions', __NAMESPACE__ . '\\remove_post_row_actions', 10, 2 );
	add_filter( 'manage_edit-xb_sortable_columns', __NAMESPACE__ . '\\xb_table_sorting' );
	add_filter( 'request', __NAMESPACE__ . '\\xb_block_column_orderby' );
	add_filter( 'bulk_actions-edit-xb', '__return_empty_array' );
	add_filter( 'views_edit-xb', __NAMESPACE__ . '\\render_date_range_links' );
	add_filter( 'months_dropdown_results', '__return_empty_array' );
	add_filter( 'manage_xb_posts_columns', __NAMESPACE__ . '\\add_microcopy_to_column_titles', 99 );

	add_action( 'pre_get_posts', __NAMESPACE__ . '\\modify_views_list_query' );
	add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\\enqueue_styles' );
}

/**
 * Enqueue styles.
 */
function enqueue_styles( $pagenow ) {
	// Bail early if we aren't on an edit page.
	if ( $pagenow !== 'edit.php' ) {
		return;
	}

	// Bail if we aren't on the XB edit page, specifically.
	if ( get_query_var( 'post_type' ) !== Blocks\POST_TYPE ) {
		return;
	}

	wp_enqueue_style( 'xb-insights', plugin_dir_url( __FILE__ ) . '/assets/style.css', [], '18-03-2021', 'screen' );
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
	unset( $columns['altis_publication_checklist_status'] );

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
	if ( Blocks\POST_TYPE === $post->post_type ) {
		unset( $actions['edit'] );
		unset( $actions['view'] );
		unset( $actions['trash'] );
		unset( $actions['inline hide-if-no-js'] );
	}

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
	return $columns;
}

/**
 * Add additional microcopy to column titles.
 *
 * Note: This adds an additional span around the column title as there is no current way to filter the column title span itself.
 *
 * @see https://github.com/WordPress/WordPress/blob/643888dfc6697877609672087b4d3b4e5bf545ff/wp-admin/includes/class-wp-posts-list-table.php#L1059
 *
 * @param array $xb_columns An array of columns for the XB post type.
 *
 * @return array The filtered array of columns.
 */
function add_microcopy_to_column_titles( array $xb_columns ) : array {
	$microcopy = [
		'block' => __( 'List of XBs modified in the selected date range', 'altis-analytics' ),
		'views' => __( 'Total unique views of the XBs during the selected date range', 'altis-analytics' ),
		'conversion' => __( 'Average conversion rate is calculated as the total unique conversions divided by total unique views of the XB during the selected date range,  expressed as a percentage.', 'altis-analytics' ),
		'details' => __( 'Block last modified date and author', 'altis-analytics' ),
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
			?>
			<a href="<?php echo esc_url_raw( add_query_arg( [ 'days' => $current['days'] ] ) ); ?>" class="<?php echo esc_html( "date-range-button $selected" ); ?>"><?php echo esc_html( $current['label'] ); ?></a>
		<?php } ?>
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
 * Render the last modified / author column data.
 */
function render_last_modified_author() {
	global $post;
	?>
	<div class="post--last-modified">
		<span class="post--last-modified-date"><?php echo esc_attr( get_the_modified_date( '', $post ) ); ?></span>
		<span class="post--last-modified-time"><?php echo esc_attr( get_the_modified_time( '', $post ) ); ?></span>
	</div>
	<div class="post--author">
		<?php echo esc_attr( get_the_author_meta( 'display_name', $post->post_author ) ); ?>
	</div>
	<?php
}

/**
 * Render the views column data.
 */
function render_views() {
	global $post;
	$views = Blocks\get_views( $post->post_name, [ 'days' => get_days_view() ] )['views'];
	?>
	<div class="post--views"><?php echo number_format_i18n( $views ); ?></div>
	<?php
}

/**
 * Render the average conversion rate column data.
 */
function render_average_conversion_rate() {
	global $post;
	$block = Blocks\get_views( $post->post_name, [ 'days' => get_days_view() ] );
	$conversions = $block['conversions'];
	$views = $block['views'];
	$rate = round( calculate_average_conversion_rate( [
		'conversions' => $conversions,
		'views' => $views,
	] ) * 100 );
	?>
	<div class="post--avg-conversion-rate"><?php echo absint( $rate ); ?>%
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
 * Calculate average conversion rate.
 *
 * @param array $block_data An array of block data.
 * @param string $block_id A single block clientID.
 *
 * @return float The conversion rate (calculated by conversions / views).
 */
function calculate_average_conversion_rate( array $block_data = [], string $block_id = '' ) : float {
	if ( empty( $block_data ) ) {
		$block_data = [
			'conversions' => 0,
			'views' => 0,
		];

		if ( ! empty( $block_id ) ) {
			$block_data = get_block_data( $block_id );
		}
	}

	// Avoid division by zero.
	if ( $block_data['views'] === 0 ) {
		return 0;
	}

	return $block_data['conversions'] / $block_data['views'];
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
		$block_data = wp_list_pluck( $block['events']['buckets'], 'doc_count', 'key' );
		$views = $block_data['experienceView'] ?? 0;
		$conversions = $block_data['conversion'] ?? 0;
		$data[ $block_id ]['views'] = $views;
		$data[ $block_id ]['conversions'] = $conversions;
		$data[ $block_id ]['avg_conversion_rate'] = calculate_average_conversion_rate( [
			'views' => $views,
			'conversions' => $conversions,
		] );
	}

	return $data;
}

/**
 * Sort data by conversion rate.
 *
 * @param array $list The array of analytics data by block id.
 * @param string $order The order to sort by. Accepted values are 'asc' or 'desc'.
 *
 * @return array The sorted array.
 */
function sort_by_conversion_rate( array $list, string $order = 'desc' ) : array {
	// If an invalid value was passed to $order, default to 'desc'.
	if ( ! in_array( $order, [ 'asc', 'desc' ], true ) ) {
		$order = 'desc';
	}

	$avg_conversion_rate = array_column( $list, 'avg_conversion_rate' );
	$sort_order = ( $order === 'desc' ) ? SORT_DESC : SORT_ASC;

	array_multisort( $avg_conversion_rate, $sort_order, $list );

	return $list;
}

/**
 * Get data from a single block.
 *
 * @uses get_views_list()
 *
 * @param string $block_id Get a single block's analytics data pulled from the ES query.
 *
 * @return array The block's analytics data.
 */
function get_block_data( string $block_id ) : array {
	$data = get_views_list();
	return $data[ $block_id ];
}

/**
 * Get analytics views list data.
 *
 * @todo Integrate date range searches.
 *
 * @param string $order How to order the data. Accepted values are 'asc' and 'desc'. Defaults to 'desc'.
 * @param int $days How many days worth of analytics to fetch. Defaults to 7.
 */
function get_views_list( string $order = 'desc', int $days = 7 ) : array {
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
						// We're just interested in views.
						'terms' => [
							'event_type.keyword' => [
								'experienceView',
								'conversion',
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
					'order' => [
						'_count' => $order,
					],
				],
				'aggs' => [
					'events' => [
						'terms' => [
							'field' => 'event_type.keyword',
						],
					],
					'aggs' => [
						'uniques' => [
							'cardinality' => 'endpoint.Id.keyword',
						],
					],
				],
			],
		],
		'size' => 0,
	];

	// 1: Sort order, asc or desc.
	// 2: Start date to query by.
	// 3: End date to query by.
	$key = sprintf( 'views:list:%1$s:days:%2$d', $order, $days );
	$cache = wp_cache_get( $key, 'altis-xbs' );

	if ( $cache ) {
		return $cache;
	}

	$result = Utils\query( $query );

	// Check for a result before getting aggregated data.
	$data = get_aggregate_data( $result['aggregations']['blocks']['buckets'] ?? [] );

	// Don't cache anything if we didnt' get a result.
	if ( ! empty( $data ) ) {
		wp_cache_set( $key, $data, 'altis-xbs', 5 * MINUTE_IN_SECONDS );
	}

	return $data;
}

/**
 * Alter the default WP_Query to change the sort order.
 *
 * @todo Finish this function.
 *
 * @param \WP_Query $query The WP_Query object.
 *
 * @return \WP_Query The updated WP_Query object.
 */
function modify_views_list_query( $query ) {
	// Bail if we aren't looking at the XB Insights page.
	if ( $query->get( 'post_type' ) !== Blocks\POST_TYPE ) {
		return $query;
	}

	$order = $query->get( 'order' ) ?: 'desc';
	$orderby = $query->get( 'orderby' ) ?: 'views';
	$days = get_days_view();

	$list = get_views_list( $order, $days );

	// If we're ordering by conversion, update the list.
	if ( $orderby === 'conversion' ) {
		$list = sort_by_conversion_rate( $list, $order );
	}

	// Pluck the client ids out of the list.
	$client_ids = array_keys( $list );

	// Order by client ID (stored as post slug).
	$query->set( 'post_name__in', $client_ids );
	$query->set( 'orderby', 'post_name__in' );

	return $query;
}
