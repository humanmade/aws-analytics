<?php
/**
 * Altis Accelerate analytics API.
 *
 * @package altis/accelerate
 */

namespace Altis\Analytics\API;

use Altis\Analytics\Dashboard;
use Altis\Analytics\Blocks;
use Altis\Analytics\Utils;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use WP_Query;

const API_NAMESPACE = 'analytics/v1';

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
			'default' => 'day',
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
 * @param string|int $resolution Resolution for histogram data.
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
				'extended_bounds' => [
					'min' => (int) sprintf( '%d000', $start ),
					'max' => (int) sprintf( '%d999', min( $end, time() ) ), // Don't show beyond current time.
				],
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
				'field' => 'event_timestamp',
				'interval' => $resolution,
				'extended_bounds' => [
					'min' => (int) sprintf( '%d000', $start ),
					'max' => (int) sprintf( '%d999', min( $end, time() ) ),
				],
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

	$histogram_agg = [
		'histogram' => [
			'field' => 'event_timestamp',
			'interval' => DAY_IN_SECONDS * 1000, // Days.
			'extended_bounds' => [
				'min' => (int) sprintf( '%d000', $start ),
				'max' => (int) sprintf( '%d999', $end ),
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
						'size' => 10000,
					],
					'aggregations' => [
						'histogram' => $histogram_agg,
					],
				],
			],
		],
		'blocks' => [
			'filter' => [
				'term' => [ 'event_type.keyword' => 'blockView' ],
			],
			'aggregations' => [
				'ids' => [
					'terms' => [
						'field' => 'attributes.blockId.keyword',
						'size' => 10000,
					],
					'aggregations' => [
						'histogram' => $histogram_agg,
					],
				],
			],
		],
		'xbs' => [
			'filter' => [
				'terms' => [ 'event_type.keyword' => [ 'experienceView', 'conversion' ] ],
			],
			'aggregations' => [
				'ids' => [
					'terms' => [
						'field' => 'attributes.clientId.keyword',
						'size' => 10000,
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
						'histogram' => $histogram_agg,
					],
				],
			],
		],
	];

	$query = get_query(
		[ 'pageView', 'blockView', 'experienceView', 'conversion' ],
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
	$xbs = $res['aggregations']['xbs']['ids']['buckets'] ?? [];

	$all = array_merge( $posts, $blocks, $xbs );
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
			if ( function_exists( 'Altis\\Analytics\\Blocks\\get_block_post' ) ) {
				$block = Blocks\get_block_post( $item['key'] );
				if ( $block ) {
					$id = $block->ID;
				} else {
					continue;
				}
			} else {
				continue;
			}
		}
		$processed[ intval( $id ) ] = $item;
	}

	// Ensure reusable blocks and XBs are shown.
	$post_types = get_post_types( [ 'public' => true ] );
	$post_types = array_merge( [ 'wp_block', 'xb' ], $post_types );
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
			$default_query_args['post_type'] = $filter->type;
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
		$thumbnail_id = 0;
		if ( $post->post_type === 'attachment' ) {
			$thumbnail_id = $post->ID;
		} else {
			$thumbnail_id = get_post_thumbnail_id( $post ) ?: 0;
		}

		$thumbnail = $thumbnail_id ? wp_get_attachment_image_url( $thumbnail_id, get_available_thumbnail_size() ) : '';

		if ( $post->post_type === 'wp_block' && Dashboard\is_block_thumbnails_allowed( $post->ID ) ) {
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
					'width' => 100,
					'selector' => 'altis-block-preview',
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
			'url' => get_post_type_object( $post->post_type )->public ? get_the_permalink( $post->ID ) : null,
			'editUrl' => get_edit_post_link( $post->ID, 'rest' ),
			'author' => [
				'ID' => intval( $post->post_author ),
				'name' => get_the_author_meta( 'display_name', $post->post_author ),
				'avatar' => get_avatar_url( $post->post_author ),
			],
			'thumbnail' => $thumbnail ?: '',
			'views' => $processed[ $post->ID ]['total'] ?? 0,
			'histogram' => Utils\normalise_histogram( $processed[ $post->ID ]['histogram']['buckets'] ?? [] ),
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

/**
 * Get the best thumbnail size available to use with Content Explorer.
 *
 * @return string
 */
function get_available_thumbnail_size() : string {
	$sizes = [ 'post-thumbnail', 'thumbnail', '100x50' ];

	foreach ( $sizes as $size ) {
		if ( has_image_size( $size ) ) {
			return $size;
		}
	}

	return $size; // Return the fallback size, the last one.
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
