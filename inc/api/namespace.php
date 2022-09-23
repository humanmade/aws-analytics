<?php
/**
 * Altis Accelerate analytics API.
 *
 * @package altis/accelerate
 *
 * phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
 */

namespace Altis\Analytics\API;

use Altis\Analytics\Blocks;
use Altis\Analytics\Dashboard;
use Altis\Analytics\Utils;
use WP_Error;
use WP_Query;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

const API_NAMESPACE = 'accelerate/v1';

/**
 * Bootstrap analytics API.
 *
 * @return void
 */
function setup() {
	add_action( 'rest_api_init', __NAMESPACE__ . '\\register_endpoints' );

	// Add our standard stats aggs.
	register_default_aggregations();
}

/**
 * Register APi routes.
 *
 * @return void
 */
function register_endpoints() {
	$date_args = [
		'start' => [
			'type' => 'string',
			'format' => 'date-time',
			'required' => true,
		],
		'end' => [
			'type' => 'string',
			'format' => 'date-time',
			'required' => true,
		],
		'interval' => [
			'type' => 'string',
			'default' => '1 day',
		],
	];

	register_rest_route( API_NAMESPACE, 'stats', [
		'method' => WP_REST_Server::READABLE,
		'callback' => __NAMESPACE__ . '\\get_stats',
		'permission_callback' => __NAMESPACE__ . '\\check_analytics_permission',
		'args' => array_merge( [
			'path' => [
				'type' => 'string',
			],
		], $date_args ),
	] );

	register_rest_route( API_NAMESPACE, 'top', [
		'method' => WP_REST_Server::READABLE,
		'callback' => __NAMESPACE__ . '\\get_top',
		'permission_callback' => __NAMESPACE__ . '\\check_analytics_permission',
		'args' => array_merge( [
			'type' => [
				'type' => 'string',
			],
			'author' => [
				'type' => 'number',
			],
			'search' => [
				'type' => 'string',
			],
			'page' => [
				'type' => 'number',
				'default' => 1,
			],
		], $date_args ),
	] );

	register_rest_route( API_NAMESPACE, 'diff', [
		'method' => WP_REST_Server::READABLE,
		'callback' => __NAMESPACE__ . '\\get_diff',
		'permission_callback' => __NAMESPACE__ . '\\check_analytics_permission',
		'args' => array_merge( [
			'ids' => [
				'type' => 'array',
				'items' => [
					'type' => 'number',
				],
			],
		], $date_args ),
	] );
}

/**
 * Check user permissions for viewing analytics data.
 *
 * @return bool
 */
function check_analytics_permission() : bool {
	return current_user_can( 'edit_posts' );
}

/**
 * Handle stats endpoint.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_Error|array
 */
function get_stats( WP_REST_Request $request ) {
	$start = strtotime( $request['start'] );
	$end = strtotime( $request['end'] );

	$filter = new Filter();
	if ( $request['filter'] && is_array( $request['filter'] ) ) {
		foreach ( $request['filter'] as $key => $value ) {
			if ( property_exists( $filter, $key ) ) {
				$filter->$key = $value;
			}
		}
	}

	return get_graph_data( $start, $end, $request['interval'], $filter );
}

/**
 * Handle top content endpoint.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_Error|WP_REST_Response
 */
function get_top( WP_REST_Request $request ) {
	$start = strtotime( $request['start'] );
	$end = strtotime( $request['end'] );

	$filter = new Filter();
	if ( $request['search'] ) {
		$filter->search = $request['search'];
	}
	if ( $request['type'] ) {
		$filter->type = $request['type'];
	}
	if ( $request['user'] ) {
		$filter->user = (int) $request['user'];
	}
	if ( $request['page'] ) {
		$filter->page = (int) $request['page'];
	}

	$data = get_top_data( $start, $end, $filter );

	if ( is_wp_error( $data ) ) {
		return $data;
	}

	$response = new WP_REST_Response( $data['posts'], 200, [
		'X-WP-Total' => $data['total'],
		'X-WP-TotalPages' => $data['max_pages'],
	] );

	return $response;
}

/**
 * Handle diff endpoint.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_Error|array
 */
function get_diff( WP_REST_Request $request ) {
	$start = strtotime( $request['start'] );
	$end = strtotime( $request['end'] );
	$post_ids = $request['ids'] ?? [];

	return get_post_diff_data( $post_ids, $start, $end, $request['interval'] );
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
function get_graph_data( $start, $end, $resolution = '1 day', ?Filter $filter = null ) {
	global $wpdb;

	$query_where = [ '1=1' ];
	$query_params = [
		'blog_id' => get_current_blog_id(),
		'start' => (int) $start,
		'end' => (int) $end,
	];

	if ( ! empty( $filter ) ) {
		if ( $filter->path ) {
			$url_path = home_url( $filter->path );
			if ( parse_url( $url_path, PHP_URL_SCHEME ) === 'http' ) {
				$url_path_alt = 'https' . substr( $url_path, 4 );
			} else {
				$url_path_alt = 'http' . substr( $url_path, 5 );
			}
			$query_where[] = "attributes['url'] = {path:String} OR attributes['url'] = {path_alt:String}";
			$query_params['path'] = $url_path;
			$query_params['path_alt'] = $url_path_alt;
		}
	}

	$query_where = sprintf( 'AND (%s)', implode( ') AND (', $query_where ) );

	// Build SQL query.
	$query =
		"SELECT
			toStartOfInterval(event_timestamp, INTERVAL {$resolution}) as `date`,
			-- views
			count() as views,
			-- uniques
			uniqCombined64(endpoint_id) as uniques,
			-- returning
			uniqCombined64If(endpoint_id, endpoint_metrics['sessions'] > 1) as returning,
			-- bounce
			uniqCombined64If(endpoint_id, endpoint_metrics['pageViews'] < 2) as bounce
		FROM analytics
		WHERE
			blog_id = {blog_id:String}
			AND event_timestamp >= toDateTime64({start:UInt64},3)
			AND event_timestamp <= toDateTime64({end:UInt64},3)
			AND event_type = 'pageView'
			{$query_where}
		GROUP BY
			`date`
			WITH ROLLUP
		ORDER BY `date` ASC
			WITH FILL FROM toDateTime({start:UInt64}) STEP INTERVAL {$resolution}";

	$key = sprintf( 'analytics:stats:%s', sha1( serialize( [ $query, $query_params ] ) ) );
	$cache = wp_cache_get( $key, 'altis' );
	if ( $cache ) {
		return $cache;
	}

	$res = Utils\clickhouse_query( $query, $query_params );

	if ( is_wp_error( $res ) ) {
		return $res;
	}

	if ( ! $res ) {
		return new WP_Error( 'analytics.error' );
	}

	$data = [
		'by_interval' => [],
		'stats' => [
			'summary' => [
				'views' => 0,
				'visitors' => 0,
				'returning' => 0,
				'bounce' => 0,
			],
		],
	];

	foreach ( $res as $row ) {
		if ( empty( strtotime( $row->date ) ) ) {
			$data['stats']['summary'] = [
				'views' => (int) $row->views,
				'visitors' => (int) $row->uniques,
				'returning' => (int) $row->returning,
				'bounce' => (int) $row->bounce,
			];
		} else {
			$data['by_interval'][ $row->date ] = [
				'views' => (int) $row->views,
				'visitors' => (int) $row->uniques,
				'returning' => (int) $row->returning,
				'bounce' => (int) $row->bounce,
			];
		}
	}

	// Add registered term aggregations.
	$registered_aggs = apply_filters( 'altis.analytics.ui.graph_aggregations', [] );
	foreach ( $registered_aggs as $name => $agg_options ) {
		$field = $agg_options['field'];
		$aggregation = $agg_options['aggregation'];

		if ( ! preg_match( '/^[a-zA-Z0-9_\[\]\']+$/', $field ) ) {
			trigger_error( sprintf( 'Field name "%s" is not valid for term aggregation', $field ), E_USER_WARNING );
			continue;
		}

		if ( ! preg_match( '/^[a-zA-Z0-9]+\(.*?\)$/', $aggregation ) ) {
			trigger_error( sprintf( 'Aggregation function "%s" is not valid for term aggregation', $field ), E_USER_WARNING );
			continue;
		}

		if ( ! empty( $agg_options['where'] ) ) {
			$query_where .= sprintf( ' AND (%s)', $agg_options['where'] );
		}

		$res = Utils\clickhouse_query(
			"SELECT
				{$field} as `key`,
				{$aggregation} as `value`
			FROM analytics
			WHERE
				blog_id = {blog_id:String}
				AND event_timestamp >= toDateTime64({start:UInt64},3)
				AND event_timestamp <= toDateTime64({end:UInt64},3)
				AND event_type = {event_type:String}
				{$query_where}
			GROUP BY {$field}
			ORDER BY `value` DESC
			LIMIT {limit:UInt8}",
			array_merge( $query_params, [
				'event_type' => $agg_options['event'],
				'limit' => $agg_options['limit'],
			], $agg_options['where_params'] ?? [] )
		);

		if ( is_wp_error( $res ) ) {
			trigger_error( $res->get_error_message(), E_USER_WARNING );
			continue;
		}

		if ( ! isset( $agg_options['parse_result'] ) ) {
			continue;
		}

		$callback = $agg_options['parse_result'] ?? __NAMESPACE__ . '\\collect_aggregation';
		$data['stats'][ $name ] = call_user_func( $callback, $res );
	}

	wp_cache_set( $key, $data, 'altis', MINUTE_IN_SECONDS );

	return $data;
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
	$query_where = [ '1=1' ];
	$query_params = [
		'blog_id' => get_current_blog_id(),
		'start' => (int) $start,
		'end' => (int) $end,
	];

	if ( ! empty( $filter ) ) {
		if ( $filter->type ) {
			$types_where = array_map( function ( $type ) use ( $query_params ) {
				if ( $type === 'xb' ) {
					return "event_type IN ('experienceView', 'conversion')";
				}
				if ( $type === 'wp_block' ) {
					return "event_type = 'blockView'";
				}
				$query_params[ 'type_' . $type ] = $type;
				return sprintf( "event_type = 'pageView' AND attributes['postType'] = {type_%s:String}", $type );
			}, explode( ',', $filter->type ) );
			$query_where[] = sprintf( '(%s)', implode( ') OR (', $types_where ) );
		}
		if ( $filter->path ) {
			$url = home_url( $filter->path );
			$query_where[] = "attributes['url'] = {url:String}";
			$query_params['url'] = $url;
		}
	}

	$query_where = sprintf( ' AND (%s) ', implode( ') AND (', $query_where ) );

	$query =
		"SELECT
			-- Section: group ID
			multiIf(
				event_type = 'pageView' AND attributes['postId'] != '', attributes['postId'],
				event_type = 'blockView', attributes['blockId'],
				event_type IN ('experienceView', 'conversion'), attributes['clientId'],
				attributes['url']
			) as id,
			-- Section: event counts
			countIf(event_type != 'conversion') as views,
			uniqCombined64If(endpoint_id, event_type != 'conversion') as unique_views,
			(
				uniqCombined64If(endpoint_id, event_type = 'experienceView' AND attributes['audience'] = '0') +
				uniqCombined64If(endpoint_id, event_type = 'experienceView' AND attributes['eventVariantId'] = '0')
			) as unique_fallback_views,
			uniqCombined64If(endpoint_id, event_type = 'conversion') as unique_conversions,
			(
				uniqCombined64If(endpoint_id, event_type = 'conversion' AND attributes['audience'] = '0') +
				uniqCombined64If(endpoint_id, event_type = 'conversion' AND attributes['eventVariantId'] = '0')
			) as unique_fallback_conversions
		FROM analytics
		WHERE
			blog_id = {blog_id:String}
			AND event_timestamp >= toDateTime64({start:UInt64},3)
			AND event_timestamp <= toDateTime64({end:UInt64},3)
			AND event_type IN ('pageView', 'blockView', 'experienceView', 'conversion')
			{$query_where}
		GROUP BY id
		ORDER BY views DESC
		LIMIT 300"; // Limit of the top content returned for Content Explorer, max 12 pages worth.

	$key = sprintf( 'analytics:top:%s', sha1( serialize( [ $query, $query_params ] ) ) );
	$cache = wp_cache_get( $key, 'altis' );
	if ( $cache ) {
		return $cache;
	}

	$res = Utils\clickhouse_query( $query, $query_params );

	if ( is_wp_error( $res ) ) {
		return $res;
	}

	$processed = [];

	foreach ( $res as $row ) {
		$id = $row->id;
		if ( ! is_numeric( $id ) ) {
			if ( strpos( $id, 'http' ) === 0 ) {
				// This is not a block or post ID but other "unknown" URL.
				continue;
			}
			if ( function_exists( 'Altis\\Analytics\\Blocks\\get_block_post' ) ) {
				$block = Blocks\get_block_post( $id );
				if ( $block ) {
					$id = $block->ID;
				} else {
					continue;
				}
			} else {
				continue;
			}
		}
		$processed[ intval( $id ) ] = $row;
	}

	// Ensure reusable blocks and XBs are shown if available.
	$post_types = get_post_types( [ 'public' => true ] );
	if ( post_type_exists( 'wp_block' ) ) {
		$post_types[] = 'wp_block';
	}
	if ( post_type_exists( 'xb' ) ) {
		$post_types[] = 'xb';
	}
	$post_types = array_unique( $post_types );

	$post_ids = array_keys( $processed );

	$posts_per_page = 25;
	$default_query_args = [
		'post_type' => $post_types,
		'post_status' => 'publish',
		'posts_per_page' => $posts_per_page,
		'paged' => 1,
		'ignore_sticky_posts' => true,
	];

	if ( ! empty( $filter ) ) {
		if ( $filter->search ) {
			$default_query_args['s'] = $filter->search;
		}
		if ( $filter->type ) {
			$default_query_args['post_type'] = explode( ',', $filter->type );
		}
		if ( $filter->user ) {
			$default_query_args['author'] = $filter->user;
		}
		if ( $filter->page ) {
			$default_query_args['paged'] = $filter->page;
		}
	}

	$query_args = array_merge( $default_query_args, [
		'post__in' => $post_ids,
		'orderby' => 'post__in',
		'order' => 'asc',
	] );

	// ElasticPress does not support ordering by post__in so remove if we're searching.
	if ( ! empty( $filter ) && $filter->search ) {
		unset( $query_args['orderby'] );
		unset( $query_args['order'] );
	}

	// Get all posts sorted by views.
	$query = new WP_Query( $query_args );

	// Get all remaining posts not in the list to complete the data set if we have some data.
	// If $post_ids is empty post__in is ignored.
	if ( ! empty( $post_ids ) ) {
		$page = max( 1, $default_query_args['paged'] - $query->max_num_pages ) - 1; // Zero indexed page value.
		$base_offset = $query->found_posts % $posts_per_page;
		$query_args_not_in = array_merge( $default_query_args, [
			// Make sure our additional query is paging from the end of the initial query.
			'offset' => ( $page * $posts_per_page ) + ( $page === 0 ? 0 : $base_offset ),
			'posts_per_page' => $posts_per_page - ( $page === 0 ? $base_offset : 0 ),
			'post__not_in' => $post_ids,
		] );
		$query_not_in = new WP_Query( $query_args_not_in );

		// Combine queries.
		$query->found_posts += $query_not_in->found_posts;
		$query->max_num_pages = ceil( $query->found_posts / $posts_per_page );
		if ( $query->post_count < $posts_per_page ) {
			$query->post_count += $query_not_in->post_count;
			$query->posts = array_merge( $query->posts, $query_not_in->posts );
			$query->posts = array_values( $query->posts );
		}
	}

	foreach ( $query->posts as $i => $post ) {
		// Check if we can get a thumbnail, set to an empty string if not but support is available.
		$thumbnail = null;
		if ( post_type_supports( $post->post_type, 'thumbnail' ) ) {
			$thumbnail_id = 0;
			if ( $post->post_type === 'attachment' ) {
				$thumbnail_id = $post->ID;
			} else {
				$thumbnail_id = get_post_thumbnail_id( $post ) ?: 0;
			}

			$thumbnail = $thumbnail_id ? wp_get_attachment_image_url( $thumbnail_id, get_available_thumbnail_size() ) : '';
		}

		// Get block thumbnail from screen grab API.
		if ( in_array( $post->post_type, [ 'wp_block', 'xb' ], true ) && Dashboard\is_block_thumbnail_allowed( $post->ID ) ) {
			$preview_url = sprintf(
				'%s?preview-block-id=%d&key=%s',
				get_home_url(),
				$post->ID,
				Dashboard\get_block_thumbnail_request_hmac( $post->ID )
			);

			$version = strtotime( $post->post_modified_gmt );

			$thumbnail = add_query_arg(
				[
					'url' => urlencode( $preview_url ),
					'width' => 200,
					'selector' => '.altis-block-preview',
					'version' => $version,
				],
				'https://eu.accelerate.altis.cloud/block-image'
			);
		}

		$query->posts[ $i ] = [
			'id' => intval( $post->ID ),
			'slug' => $post->post_name,
			'type' => [
				'name' => $post->post_type,
				'label' => get_post_type_object( $post->post_type )->labels->singular_name,
			],
			'title' => trim( wp_strip_all_tags( get_the_title( $post->ID ) ) ),
			'date' => $post->post_date,
			'url' => get_post_type_object( $post->post_type )->public ? get_the_permalink( $post->ID ) : null,
			'editUrl' => get_edit_post_link( $post->ID, 'rest' ),
			'author' => [
				'ID' => intval( $post->post_author ),
				'name' => get_the_author_meta( 'display_name', $post->post_author ),
				'avatar' => get_avatar_url( $post->post_author ),
			],
			'thumbnail' => $thumbnail,
			'views' => intval( $processed[ $post->ID ]->views ?? 0 ),
		];

		if ( $post->post_parent ) {
			$query->posts[ $i ]['parent'] = [
				'title' => trim( wp_strip_all_tags( get_the_title( $post->post_parent ) ) ),
				'editUrl' => get_edit_post_link( $post->post_parent, 'rest' ),
			];
		}

		// Get lift.
		if ( isset( $processed[ $post->ID ]->unique_views, $processed[ $post->ID ]->unique_conversions ) ) {
			$query->posts[ $i ]['lift'] = [
				'views' => (int) $processed[ $post->ID ]->unique_views,
				'conversions' => (int) $processed[ $post->ID ]->unique_conversions,
				'fallback' => [
					'views' => (int) $processed[ $post->ID ]->unique_fallback_views,
					'conversions' => (int) $processed[ $post->ID ]->unique_fallback_conversions,
				],
				'personalized' => [
					'views' => (int) $processed[ $post->ID ]->unique_views - $processed[ $post->ID ]->unique_fallback_views,
					'conversions' => (int) $processed[ $post->ID ]->unique_conversions - $processed[ $post->ID ]->unique_fallback_conversions,
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

/**
 * Get the best thumbnail size available to use with Content Explorer.
 *
 * @return string
 */
function get_available_thumbnail_size() : string {
	$sizes = [ 'post-thumbnail', 'thumbnail', 'medium', 'medium_large', 'full' ];

	foreach ( $sizes as $size ) {
		if ( has_image_size( $size ) ) {
			return $size;
		}
	}

	return $size; // Return the fallback size.
}

/**
 * Add default aggeregations for stats.
 *
 * @return void
 */
function register_default_aggregations() {
	register_term_aggregation( "attributes['url']", 'by_url', [
		'title' => __( 'Top URLs', 'altis-accelerate' ),
		'total' => 'stats.summary.views',
		'filter_key' => 'path',
		'parse_result' => function ( $res ) {
			return relativize_urls( home_url(), collect_aggregation( $res ) );
		},
	] );
	register_term_aggregation( "attributes['referer']", 'by_referer', [
		'title' => __( 'Referrers', 'altis-accelerate' ),
		'where' => sprintf( "attributes['referer'] NOT ILIKE '%s%%'", home_url() ),
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
	register_term_aggregation( 'country', 'by_country', [
		'title' => __( 'Countries', 'altis-accelerate' ),
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
	register_term_aggregation( 'model', 'by_browser', [
		'title' => __( 'Browsers', 'altis-accelerate' ),
	] );
	register_term_aggregation( 'platform', 'by_os', [
		'title' => __( 'Operating System', 'altis-accelerate' ),
	] );
	register_term_aggregation( "attributes['search']", 'by_search_term', [
		'title' => __( 'On-site Search Terms', 'altis-accelerate' ),
		'where' => "attributes['search'] != ''",
	] );
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
	foreach ( $aggregation as $bucket ) {
		$data[ $bucket->key ] = (int) $bucket->value;
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
 * @param string $field The field name in the ClickHouse database.
 * @param string $short_name Short version of the field name for the aggregation.
 * @param array $options Allows modifying the aggregation query result parsing.
 * @return void
 */
function register_term_aggregation( $field, $short_name, $options = [] ) {
	$options = wp_parse_args( $options, [
		'title' => $short_name,
		'value_title' => __( 'Views', 'altis-accelerate' ),
		'limit' => 5,
		'total' => false,
		'filter_key' => false,
		'field' => $field,
		'aggregation' => 'count()',
		'event' => 'pageView',
		'where' => '',
		'where_params' => [],
		'missing' => __( 'Unknown', 'altis' ),
		'parse_result' => __NAMESPACE__ . '\\collect_aggregation',
	] );

	add_filter( 'altis.analytics.ui.graph_aggregations', function ( $aggs ) use ( $short_name, $options ) {
		$aggs[ $short_name ] = $options;
		return $aggs;
	} );
}

/**
 * Get event stats diff for current and previous time period.
 *
 * @param array $post_ids Specific posts to narrow the query down by.
 * @param int $start The start timestamp.
 * @param int $end The end timestamp.
 * @param string|array $resolution Resolution for histogram data. Can be any `toStartOf*` suffix, or array of toStartOfInterval values.
 *                     See https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#tostartofintervaltime_or_data-interval-x-unit--time_zone
 * @return array|WP_error
 */
function get_post_diff_data( array $post_ids, $start, $end, $resolution = '1 day' ) {
	global $wpdb;

	if ( empty( $post_ids ) ) {
		return new WP_Error(
			'analytics.error',
			'List of post IDs cannot be empty.'
		);
	}

	if ( ! preg_match( '/\d+ (second|minute|hour|day|week|month|year)/', $resolution ) ) {
		return new WP_Error(
			'analytics.error.resolution',
			'The requested histogram resolution did not match the expected pattern e.g. "1 day", "4 hour"'
		);
	}

	// Real start & end.
	$diff = $end - $start;

	$query_params = [
		'start' => (int) $start,
		'blog_id' => get_current_blog_id(),
		'prev_start' => $start - $diff,
		'end' => $end,
	];

	// Store results from query / cache.
	$data = [];

	$page_view_ids = [];
	$block_view_ids = [];
	$experience_view_ids = [];

	foreach ( $post_ids as $id ) {
		$key = sprintf( 'analytics:post_diff:%s', sha1( serialize( [ $id, $start, $end, $resolution ] ) ) );
		$cache = wp_cache_get( $key, 'altis' );
		if ( $cache ) {
			$data[ $id ] = $cache;
			continue;
		}

		// Determine attribute to filter results on.
		if ( is_numeric( $id ) ) {
			if ( get_post_type( $id ) === 'wp_block' ) {
				$block_view_ids[] = $id;
			} elseif ( get_post_type( $id ) === 'xb' ) {
				$experience_view_ids[ $id ] = get_post( $id )->post_name;
			} else {
				$page_view_ids[] = $id;
			}
		} else {
			$experience_view_ids[] = $id;
		}
	}

	$page_ids_sql = $wpdb->prepare( implode( ',', array_fill( 0, count( $page_view_ids ), '%s' ) ), ...$page_view_ids );
	$block_ids_sql = $wpdb->prepare( implode( ',', array_fill( 0, count( $block_view_ids ), '%s' ) ), ...$block_view_ids );
	$experience_ids_sql = $wpdb->prepare( implode( ',', array_fill( 0, count( $experience_view_ids ), '%s' ) ), ...$experience_view_ids );

	$resolution = esc_sql( $resolution );

	// Generate fields for histogram of current date range.
	$buckets = [];
	$bucket_start = $start;
	while ( $bucket_start < $end ) {
		$bucket_end = strtotime( "+{$resolution}", $bucket_start );
		$buckets[ $bucket_start ] = sprintf(
			'uniqCombined64If(endpoint_id, event_timestamp >= toDateTime64(%1$d,3) AND event_timestamp < toDateTime64(%2$d,3)) as `%1$d`',
			$bucket_start,
			$bucket_end
		);
		$bucket_start = $bucket_end;
	}
	$bucket_sql = implode( ',', $buckets );

	$res = Utils\clickhouse_query(
		"SELECT
			multiIf(
				event_type = 'blockView', attributes['blockId'],
				event_type = 'experienceView', attributes['clientId'],
				attributes['postId']
			) as id,
			uniqCombined64(endpoint_id) as uniques,
			uniqCombined64If(endpoint_id, event_timestamp < toDateTime64({start:UInt64},3)) as uniques_previous,
			uniqCombined64If(endpoint_id, event_timestamp >= toDateTime64({start:UInt64},3)) as uniques_current,
			{$bucket_sql}
		FROM analytics
		WHERE
			blog_id = {blog_id:String}
			AND event_timestamp >= toDateTime64({prev_start:UInt64},3)
			AND event_timestamp <= toDateTime64({end:UInt64},3)
			AND event_type IN ('pageView', 'blockView', 'experienceView')
			AND (
				attributes['postId'] IN ({$page_ids_sql})
				OR attributes['blockId'] IN ({$block_ids_sql})
				OR attributes['clientId'] IN ({$experience_ids_sql})
			)
		GROUP BY id
		ORDER BY id",
		$query_params
	);

	if ( is_wp_error( $res ) ) {
		return $res;
	}

	if ( count( $post_ids ) > count( $data ) ) {
		$experience_block_ids = array_flip( $experience_view_ids );

		// Process aggregation and cache results.
		foreach ( $res as $row ) {
			$id = is_numeric( $row->id ) ? (int) $row->id : $experience_block_ids[ $row->id ];
			if ( isset( $data[ $id ] ) ) {
				continue;
			}

			$key = sprintf( 'analytics:post_diff:%s', sha1( serialize( [ $id, $start, $end, $resolution ] ) ) );

			$data[ $id ] = [
				'previous' => [
					'uniques' => intval( $row->uniques_previous ?? 0 ),
				],
				'current' => [
					'uniques' => intval( $row->uniques_current ?? 0 ),
					'by_date' => array_map( function ( $bucket_start ) use ( $row ) {
						return [
							'index' => (int) sprintf( '%d000', $bucket_start ),
							'count' => intval( $row->$bucket_start ?? 0 ),
						];
					}, array_keys( $buckets ) ),
				],
			];

			wp_cache_set( $key, $data[ $id ], 'altis', MINUTE_IN_SECONDS * 5 );
		}
	}

	return $data;
}
