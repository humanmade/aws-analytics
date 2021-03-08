<?php
/**
 * Dashboard Analytics
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Dashboard;

use function Altis\Analytics\Blocks\get_views;

function setup() {
	add_filter( 'manage_posts_columns', __NAMESPACE__ . '\\remove_default_columns', 10, 2 );
	add_filter( 'post_row_actions', __NAMESPACE__ . '\\remove_post_row_actions', 10, 2 );
	add_filter( 'bulk_actions-edit-xb', '__return_empty_array' );
	add_filter( 'views_edit-xb', '__return_null' );
	add_filter( 'months_dropdown_results', __NAMESPACE__ . '\\remove_date_filter', 10, 2 );
}

function remove_default_columns( $columns, $post_type ) : array {
	if ( 'xb' === $post_type ) {
		unset( $columns['cb'] );
		unset( $columns['title'] );
		unset( $columns['altis_publication_checklist_status'] );
	}

	return $columns;
}

function remove_post_row_actions( $actions, $post ) {
	if ( 'xb' === $post->post_type ) {
		unset( $actions['edit'] );
		unset( $actions['view'] );
		unset( $actions['trash'] );
		unset( $actions['inline hide-if-no-js'] );
	}

	return $actions;
}

function render_block_column() {
	global $post;
	?>
	<strong><a href="#"><?php echo esc_attr( $post->post_title ); ?></a></strong>
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
	$views = get_views( $post->post_name )['views'];
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
	$data = get_views( $post->post_name );
	$conversions = $data['conversions'];
	$views = $data['views'];
	return $conversions / $views;
}
