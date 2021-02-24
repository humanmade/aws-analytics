<?php
/**
 * Experience Block functions.
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Blocks;

use Altis\Analytics\Audiences;
use Altis\Analytics\Utils;
use WP_Post;
use WP_Query;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

const POST_TYPE = 'xb';

/**
 * Include and set up Experience Blocks.
 */
function setup() {
	require_once __DIR__ . '/personalization/register.php';
	require_once __DIR__ . '/personalization-variant/register.php';

	// Register blocks.
	Personalization\setup();
	Personalization_Variant\setup();

	// Set up the XB shadow post type.
	add_action( 'init', __NAMESPACE__ . '\\register_post_type' );
	add_action( 'save_post', __NAMESPACE__ . '\\on_save_post', 10, 3 );

	// Register experience block category.
	add_filter( 'block_categories', __NAMESPACE__ . '\\add_block_category', 9 );

	// Register API endpoints for getting XB analytics data.
	add_action( 'rest_api_init', __NAMESPACE__ . '\\rest_api_init' );
}

/**
 * Synchronise any XBs on the page with a shadow post type.
 *
 * @param int $post_ID Post ID.
 * @param WP_Post $post Post object.
 * @param bool $update Whether this is an existing post being updated.
 */
function on_save_post( int $post_ID, WP_Post $post, bool $update ) : void {
	if ( $post->post_type === POST_TYPE ) {
		return;
	}

	if ( $post->post_type === 'revision' ) {
		return;
	}

	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}

	// Scan for XBs in the post content.
	$blocks = parse_blocks( $post->post_content );
	$xbs = find_xbs( $blocks );

	// Stop processing if no XBs on page.
	if ( empty( $xbs ) ) {
		return;
	}

	// Find referenced XBs.
	$existing_posts = new WP_Query( [
		'post_type' => POST_TYPE,
		'post_status' => 'any',
		'post_name__in' => array_filter( array_map( function ( array $xb ) : string {
			return $xb['attrs']['clientId'];
		}, $xbs ) ),
		'posts_per_page' => 100,
		'no_found_rows' => true,
	] );

	// Update or create XB posts.
	foreach ( $xbs as $index => $xb ) {
		if ( empty( $xb['attrs']['clientId'] ) ) {
			continue;
		}

		// Extract existing post if found.
		$posts = wp_list_filter( $existing_posts->posts, [
			'post_name' => $xb['attrs']['clientId'],
		] );
		$posts = array_values( $posts ); // Reset keys.

		// Generate a default using the current post title and instance number in the content.
		$default_title = sprintf( '%s (XB %s)', $post->post_title, $index + 1 );

		if ( empty( $posts ) ) {
			// Create new shadow XB post.
			wp_insert_post( [
				'post_type' => POST_TYPE,
				'post_status' => 'publish',
				'post_content' => serialize_block( $xb ),
				'post_name' => $xb['attrs']['clientId'],
				'post_author' => get_current_user_id(),
				'post_title' => $xb['attrs']['title'] ?? $default_title,
			] );
		} else {
			// Update existing post.
			wp_update_post( [
				'ID' => $posts[0]->ID,
				'post_content' => serialize_block( $xb ),
				'post_title' => $xb['attrs']['title'] ?? $default_title,
			] );
		}
	}
}

/**
 * Recursively find blocks in a parsed blocks array.
 *
 * Use parse_blocks() on raw post content data to get the required input array.
 *
 * @param array $blocks The parsed blocks data for a post.
 * @return array
 */
function find_xbs( array $blocks ) : array {
	// Supported block types.
	$xb_types = [
		'altis/personalization',
		'altis/experiment',
	];

	$xbs = [];

	foreach ( $blocks as $block ) {
		if ( ! in_array( $block['blockName'], $xb_types, true ) ) {
			if ( ! empty( $block['innerBlocks'] ) ) {
				$xbs = array_merge(
					$xbs,
					find_xbs( $block['innerBlocks'] )
				);
			}
			continue;
		}

		$xbs[] = $block;
	}

	return $xbs;
}

/**
 * Set up the Experience Block shadow post type.
 *
 * This is used for storing meta data and long term
 * aggregated analytics data storage as well as easier referencing in code.
 *
 * @return void
 */
function register_post_type() {
	register_extended_post_type(
		POST_TYPE,
		[
			'public' => false,
			'show_ui' => false,
			'dashboard_glance' => false,
			'block_editor' => true,
			'supports' => [
				'title',
				'editor',
			],
			'menu_icon' => 'dashicons-networking',
			'menu_position' => 152,
			'show_in_rest' => true,
			'rest_base' => 'xbs',
			'hierarchical' => false,
		],
		[
			'singular' => __( 'Experience Block', 'altis-analytics' ),
			'plural' => __( 'Experience Blocks', 'altis-analytics' ),
		]
	);
}

/**
 * Adds an experience block category to the block editor.
 *
 * @param array $categories Array of block editor block type categories.
 * @return array The modified block categories array.
 */
function add_block_category( array $categories ) : array {
	$categories[] = [
		'slug' => 'altis-experience-blocks',
		'title' => __( 'Experience Blocks', 'altis-experiments' ),
	];

	return $categories;
}

/**
 * Reads and returns a block.json file to pass shared settings
 * between JS and PHP to the register blocks functions.
 *
 * @param string $name The directory name of the block relative to this file.
 * @return array|null The JSON data as an associative array or null on error.
 */
function get_block_settings( string $name ) : ?array {
	$json_path = __DIR__ . '/' . $name . '/block.json';

	// Check name is valid.
	if ( ! file_exists( $json_path ) ) {
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		trigger_error( sprintf( 'Error reading %/block.json: file does not exist.', $name ), E_USER_WARNING );
		return null;
	}

	// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	$json = file_get_contents( $json_path );

	// Decode the settings.
	$settings = json_decode( $json, ARRAY_A );

	// Check JSON is valid.
	if ( json_last_error() !== JSON_ERROR_NONE ) {
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		trigger_error( sprintf( 'Error decoding %/block.json: %s', $name, json_last_error_msg() ), E_USER_WARNING );
		return null;
	}

	return $settings;
}

/**
 * Register REST API endpoints for Experience Blocks.
 *
 * @return void
 */
function rest_api_init() : void {

	// Experience blocks views endpoint.
	register_rest_route( 'analytics/v1', 'xbs/(?P<id>[a-z0-9-]+)/views', [
		[
			'methods' => WP_REST_Server::READABLE,
			'callback' => __NAMESPACE__ . '\\handle_views_request',
			'permission_callback' => __NAMESPACE__ . '\\check_views_permission',
			'args' => [
				'id' => [
					'description' => __( 'The experience block client ID', 'altis-experiments' ),
					'required' => true,
					'type' => 'string',
					'validate_callback' => __NAMESPACE__ . '\\validate_id',
					'sanitize_callback' => __NAMESPACE__ . '\\sanitize_id',
				],
				'post_id' => [
					'description' => __( 'An optional post ID to filter by.', 'altis-experiments' ),
					'type' => 'number',
				],
			],
		],
		'schema' => [
			'type' => 'object',
			'properties' => [
				'loads' => [ 'type' => 'number' ],
				'views' => [ 'type' => 'number' ],
				'conversions' => [ 'type' => 'number' ],
				'audiences' => [
					'type' => 'array',
					'items' => get_audiences_data_schema(),
				],
				'posts' => [
					'type' => 'array',
					'items' => [
						'type' => 'object',
						'properties' => array_merge(
							get_audiences_data_schema()['properties'],
							[ 'audiences' => get_audiences_data_schema() ]
						),
					],
				],
				'postId' => [ 'type' => 'number' ],
			],
		],
	] );
}

/**
 * Get the schema for XB analytics audience metrics.
 *
 * @return array
 */
function get_audiences_data_schema() : array {
	return [
		'type' => 'object',
		'properties' => [
			'id' => [
				'type' => 'number',
			],
			'loads' => [
				'type' => 'number',
			],
			'views' => [
				'type' => 'number',
			],
			'conversions' => [
				'type' => 'number',
			],
			'unique' => [
				'type' => 'object',
				'properties' => [
					'loads' => [
						'type' => 'number',
					],
					'views' => [
						'type' => 'number',
					],
					'conversions' => [
						'type' => 'number',
					],
				],
			],
		],
	];
}

/**
 * Validate Experience Block ID.
 *
 * @param string $param The Experience Block ID.
 * @return bool
 */
function validate_id( $param ) : bool {
	return (bool) preg_match( '/[a-z0-9-]+/', $param );
}

/**
 * Sanitize Experience Block ID.
 *
 * @param string $param The Experience Block ID.
 * @return string
 */
function sanitize_id( $param ) : string {
	return preg_replace( '/[^a-z0-9-]+/', '', $param );
}

/**
 * Check current user can view XB analytics data.
 *
 * @return boolean
 */
function check_views_permission() : bool {
	$type = get_post_type_object( Audiences\POST_TYPE );
	return current_user_can( $type->cap->read );
}

/**
 * Retrieve the Experience Block views data.
 *
 * @param WP_REST_Request $request The REST request object.
 * @return WP_REST_Response
 */
function handle_views_request( WP_REST_Request $request ) : WP_REST_Response {
	$block_id = $request->get_param( 'id' );
	$post_id = $request->get_param( 'post_id' ) ?? null;
	$views = get_views( $block_id, $post_id );
	return rest_ensure_response( $views );
}

/**
 * Map event type aggregate bucket data to response format.
 *
 * @param array $event_buckets Elasticsearch aggregate buckets data.
 * @return array
 */
function map_aggregations( array $event_buckets ) : array {
	$data = [
		'loads' => 0,
		'views' => 0,
		'conversions' => 0,
		'unique' => [
			'loads' => 0,
			'views' => 0,
			'conversions' => 0,
		],
		'audiences' => [],
	];

	// Map collected event names to output schema.
	$event_type_map = [
		'experienceLoad' => 'loads',
		'experienceView' => 'views',
		'conversion' => 'conversions',
	];

	foreach ( $event_buckets as $event_bucket ) {
		$key = $event_type_map[ $event_bucket['key'] ];

		// Set the total.
		$data[ $key ] = $event_bucket['doc_count'];
		$data['unique'][ $key ] = $event_bucket['uniques']['value'];

		foreach ( $event_bucket['audiences']['buckets'] as $audience_bucket ) {
			if ( ! isset( $data['audiences'][ $audience_bucket['key'] ] ) ) {
				$data['audiences'][ $audience_bucket['key'] ] = [
					'id' => absint( $audience_bucket['key'] ),
					'loads' => 0,
					'views' => 0,
					'conversions' => 0,
					'unique' => [
						'loads' => 0,
						'views' => 0,
						'conversions' => 0,
					],
				];
			}
			$data['audiences'][ $audience_bucket['key'] ][ $key ] = $audience_bucket['doc_count'];
			$data['audiences'][ $audience_bucket['key'] ]['unique'][ $key ] = $audience_bucket['uniques']['value'];
		}
	}

	// Ensure audiences key is an array.
	$data['audiences'] = array_values( $data['audiences'] );

	return $data;
}

/**
 * Get the Experience Block views data.
 *
 * @param string $block_id The Experience block client ID to get data for.
 * @param int|null $post_id An optional post ID to limit results by.
 * @return array|WP_Error
 */
function get_views( string $block_id, ?int $post_id = null ) {
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

					// Set block ID.
					[
						'term' => [
							'attributes.clientId.keyword' => $block_id,
						],
					],

					// Limit event type to experience block related records.
					[
						'terms' => [
							'event_type.keyword' => [ 'experienceLoad', 'experienceView', 'conversion' ],
						],
					],
				],
			],
		],
		'aggs' => [
			'events' => [
				// Get buckets for each event type.
				'terms' => [
					'field' => 'event_type.keyword',
				],
				'aggs' => [
					// Get unique views by event.
					'uniques' => [
						'cardinality' => [
							'field' => 'endpoint.Id.keyword',
						],
					],
					// Get the split by audience.
					'audiences' => [
						'terms' => [
							'field' => 'attributes.audience.keyword',
						],
						'aggs' => [
							'uniques' => [
								'cardinality' => [
									'field' => 'endpoint.Id.keyword',
								],
							],
						],
					],
				],
			],
			// Get the split by post ID and audience.
			'posts' => [
				'terms' => [
					'field' => 'attributes.postId.keyword',
					'size' => 100,
				],
				'aggs' => [
					'events' => [
						// Get buckets for each even type.
						'terms' => [
							'field' => 'event_type.keyword',
						],
						'aggs' => [
							// Get uniques by event.
							'uniques' => [
								'cardinality' => [
									'field' => 'endpoint.Id.keyword',
								],
							],
							// Get the split by audience.
							'audiences' => [
								'terms' => [
									'field' => 'attributes.audience.keyword',
								],
								'aggs' => [
									'uniques' => [
										'cardinality' => [
											'field' => 'endpoint.Id.keyword',
										],
									],
								],
							],
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

	// Add post ID query filter.
	if ( $post_id ) {
		// Remove the posts aggregation.
		unset( $query['aggs']['posts'] );

		$query['query']['bool']['filter'][] = [
			'term' => [
				'attributes.postId.keyword' => (string) $post_id,
			],
		];
	}

	$key = sprintf( 'views:%s:%s', $block_id, $post_id );
	$cache = wp_cache_get( $key, 'altis-xbs' );
	if ( $cache ) {
		return $cache;
	}

	$result = Utils\query( $query );

	if ( ! $result ) {
		$data = [
			'loads' => 0,
			'views' => 0,
			'conversions' => 0,
			'audiences' => [],
		];
		wp_cache_set( $key, $data, 'altis-xbs', MINUTE_IN_SECONDS );
		return $data;
	}

	// Collect metrics.
	$data = map_aggregations( $result['aggregations']['events']['buckets'] ?? [] );

	// Add the post ID or posts aggregation.
	if ( $post_id ) {
		$data['post_id'] = $post_id;
	} else {
		$data['posts'] = [];
		foreach ( $result['aggregations']['posts']['buckets'] as $posts_bucket ) {
			$post_metrics = map_aggregations( $posts_bucket['events']['buckets'] );
			$post_metrics = [ 'id' => absint( $posts_bucket['key'] ) ] + $post_metrics;
			$data['posts'][] = $post_metrics;
		}
	}

	wp_cache_set( $key, $data, 'altis-xbs', MINUTE_IN_SECONDS * 5 );

	return $data;
}
