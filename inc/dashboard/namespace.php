<?php
/**
 * Dashboard Analytics
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Dashboard;

use function Altis\Analytics\Blocks\get_views as get_block_views;
use function Altis\Analytics\Utils\query;

/**
 * Set up the Dashboard Analytics page.
 */
function setup() {
	add_filter( 'manage_posts_columns', __NAMESPACE__ . '\\remove_default_columns', 10, 2 );
	add_filter( 'post_row_actions', __NAMESPACE__ . '\\remove_post_row_actions', 10, 2 );
	add_filter( 'manage_edit-xb_sortable_columns', __NAMESPACE__ . '\\xb_table_sorting' );
	add_filter( 'request', __NAMESPACE__ . '\\xb_block_column_orderby' );
	add_filter( 'bulk_actions-edit-xb', '__return_empty_array' );
	add_filter( 'views_edit-xb', '__return_null' );
	add_filter( 'months_dropdown_results', '__return_empty_array' );

	add_action( 'pre_get_posts', __NAMESPACE__ . '\\modify_views_list_query' );
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
	if ( 'xb' === $post_type ) {
		unset( $columns['cb'] );
		unset( $columns['title'] );
		unset( $columns['altis_publication_checklist_status'] );
	}

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
	if ( 'xb' === $post->post_type ) {
		unset( $actions['edit'] );
		unset( $actions['view'] );
		unset( $actions['trash'] );
		unset( $actions['inline hide-if-no-js'] );
	}

	return $actions;
}

/**
 * Add custom sort by columns
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
 * Render the block name column data.
 */
function render_block_column() {
	global $post;
	?>
	<strong><a href="<?php echo esc_url_raw( '/admin.php?page=xb-analytics&post=' . $post->ID ); ?>"><?php echo esc_attr( $post->post_title ); ?></a></strong>
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
	$views = get_block_views( $post->post_name )['views'];
	?>
	<div class="post--views"><?php echo number_format_i18n( $views ); ?></div>
	<?php
}

/**
 * Render the average conversion rate column data.
 */
function render_average_conversion_rate() {
	global $post;
	$block = get_block_views( $post->post_name );
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
 * Get data from a single block.
 *
 * @uses get_views_List()
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
 * @param int $start_datestamp The timestamp for the start date to query by.
 * @param int $end_datestamp The timestamp for the end date to query by.
 */
function get_views_list( string $order = 'desc', int $start_datestamp = 0, int $end_datestamp = 0 ) : array {
	$start_datestamp = $start_datestamp ?: time();
	$end_datestamp = $end_datestamp ?: strtotime( '7 days ago' );

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
				],
			],
		],
		'size' => 0,
	];

	// 1: Sort order, asc or desc.
	// 2: Start date to query by.
	// 3: End date to query by.
	$key = sprintf( 'views:list:%1$s:%2$d:%3$d', $order, date( 'Ymd', $start_datestamp ), date( 'Ymd', $end_datestamp ) );
	$cache = wp_cache_get( $key, 'altis-xbs' );

	if ( $cache ) {
		return $cache;
	}

	$result = query( $query );

	// Check for a result before getting aggregated data.
	$data = ( $result ) ? get_aggregate_data( $result['aggregations']['blocks']['buckets'] ?? [] ) : [];

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
	if (
		// Bail if we arent' in the admin.
		! is_admin() ||
		// Bail if we aren't looking at the XB Insights page.
		$query->get( 'post_type' ) !== 'xb'
	) {
		return $query;
	}

	$order = $query->get( 'order' ) ?: 'desc';
	$orderby = $query->get( 'orderby' ) ?: 'views';

	return $query;
}
