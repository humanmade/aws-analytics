<?php
/**
 * Dashboard Analytics
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Dashboard;

use function Altis\Analytics\Blocks\get_views as get_block_views;
use function Altis\Analytics\Blocks\map_aggregations;
use function Altis\Analytics\Utils\query;

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

function remove_default_columns( $columns, $post_type ) : array {
	if ( 'xb' === $post_type ) {
		unset( $columns['cb'] );
		unset( $columns['title'] );
		unset( $columns['altis_publication_checklist_status'] );
	}

	return $columns;
}

function remove_post_row_actions( $actions, $post ) : array {
	if ( 'xb' === $post->post_type ) {
		unset( $actions['edit'] );
		unset( $actions['view'] );
		unset( $actions['trash'] );
		unset( $actions['inline hide-if-no-js'] );
	}

	return $actions;
}

function xb_table_sorting( $columns ) : array {
	$columns['block'] = 'block';
	$columns['views'] = 'views';
	$columns['conversion'] = 'conversion';
	return $columns;
}

function xb_block_column_orderby( $vars ) : array {
	if ( isset( $vars['orderby'] ) && 'block' === $vars['orderby'] ) {
		$vars['orderby'] = 'title';
	}
	return $vars;
}

function render_block_column() {
	global $post;
	?>
	<strong><a href="<?php echo esc_url_raw( '/admin.php?page=xb-analytics&post=' . $post->ID ); ?>"><?php echo esc_attr( $post->post_title ); ?></a></strong>
	<?php
}

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

function render_views() {
	global $post;
	$views = get_block_views( $post->post_name )['views'];
	?>
	<div class="post--views"><?php echo number_format_i18n( $views ); ?></div>
	<?php
}

function render_average_conversion_rate() {
	global $post;
	$rate = round( calculate_average_conversion_rate( $post ) * 100 );
	?>
	<div class="post--avg-conversion-rate"><?php echo absint( $rate ); ?>%
	<?php
}

function calculate_average_conversion_rate( $post ) : float {
	$data = get_block_views( $post->post_name );
	$conversions = $data['conversions'];
	$views = $data['views'];
	return $conversions / $views;
}

function get_views_list( int $start_datestamp = 0, int $end_datestamp = 0 ) {
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
								'conversion'
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
						'_count' => $order, // We need to actually get this from the query arguments for the page.
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
	$key = sprintf( 'views:list:%1$s:%2$d:%3$d', 'desc', date( 'Ymd', $start_datestamp ), date( 'Ymd', $end_datestamp ) );
	$cache = wp_cache_get( $key, 'altis-xbs' );

	if ( $cache ) {
		return $cache;
	}

	$result = query( $query );

	if ( ! $result ) {
		// load in some default empty data here.
		$data = [];
		wp_cache_set( $key, $data, 'altis-xbs', MINUTE_IN_SECONDS );
	}

	$data = map_aggregations( $result['aggregations']['events']['buckets'] ?? [] );
	wp_cache_set( $key, $data, 'altis-xbs', 5 * MINUTE_IN_SECONDS );

	return $data;
}

function modify_views_list_query( $query ) {
	if (
		// Bail if we arent' in the admin.
		! is_admin() ||
		// Bail if we aren't looking at the XB Insights page.
		$query->get( 'post_type' ) !== 'xb' ||
		// Bail if we aren't ordering by views.
		$query->get( 'orderby' ) !== 'views'
	) {
		return $query;
	}
	return $query;
}
