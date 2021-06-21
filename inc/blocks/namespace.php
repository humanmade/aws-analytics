<?php
/**
 * Experience Block functions.
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Blocks;

use Altis\Analytics;
use Altis\Analytics\Experiments;
use Altis\Analytics\Utils;
use Altis\Workflow\PublicationChecklist;
use Altis\Workflow\PublicationChecklist\Status;
use WP_Post;
use WP_Query;

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
	add_filter( 'block_categories', __NAMESPACE__ . '\\add_block_category', 100 );

	// Change the default edit post link for XB posts.
	add_filter( 'get_edit_post_link', __NAMESPACE__ . '\\update_xb_edit_post_link', 10, 2 );

	// Register API endpoints for getting XB analytics data.
	REST_API\setup();

	// Register globally useful scripts.
	add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\\register_scripts', 1 );
	add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\\enqueue_scripts' );

	// Register an admin page for the block anlaytics view.
	add_action( 'admin_menu', __NAMESPACE__ . '\\add_block_admin_page' );
	add_action( 'admin_footer', __NAMESPACE__ . '\\modal_portal' );

	// Shim server side render block to allow passing inner blocks as attribute.
	add_filter( 'render_block_data', __NAMESPACE__ . '\\ssr_inner_blocks_shim' );
	register_ssr_inner_blocks_shim();

	// Publication checklist integration.
	add_action( 'altis.publication-checklist.register_prepublish_checks', __NAMESPACE__ . '\\check_conversion_goals' );
}

/**
 * Synchronise any XBs on the page with a shadow post type.
 *
 * @param int $post_ID Post ID.
 * @param WP_Post $post Post object.
 * @param bool $update Whether this is an existing post being updated.
 */
function on_save_post( int $post_ID, WP_Post $post, bool $update ) : void {
	// Allow external plugins to hook in early to override updating the XB shadow post.
	if ( apply_filters( 'altis.analytics.blocks.override_xb_save_post_hook', false, $post_ID, $post ) ) {
		return;
	}

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
		if ( ! isset( $xb['attrs']['title'] ) ) {
			$xb['attrs']['title'] = '';
		}

		if ( empty( $posts ) ) {
			// Create new shadow XB post.
			wp_insert_post( [
				'post_type' => POST_TYPE,
				'post_status' => 'publish',
				'post_content' => serialize_block( $xb ),
				'post_name' => $xb['attrs']['clientId'],
				'post_author' => get_current_user_id(),
				'post_title' => $xb['attrs']['title'] ?: $default_title,
				'post_parent' => $post_ID,
			] );
		} else {
			// Update existing post.
			wp_update_post( [
				'ID' => $posts[0]->ID,
				'post_content' => serialize_block( $xb ),
				'post_title' => $xb['attrs']['title'] ?: $default_title,
				'post_parent' => $post_ID,
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
			'show_ui' => true,
			'dashboard_glance' => false,
			'block_editor' => true,
			'supports' => [
				'title',
				'editor',
			],
			'menu_icon' => 'dashicons-networking',
			'menu_position' => 152,
			'show_in_rest' => true,
			'show_in_menu' => 'index.php',
			'rest_base' => 'xbs',
			'rest_controller_class' => __NAMESPACE__ . '\\REST_API\Posts_Controller',
			'hierarchical' => true,
			'labels' => [
				'name' => __( 'Experience Insights', 'altis-analytics' ),
				'all_items' => __( 'Insights', 'altis-analytics' ),
			],
			'admin_cols' => [
				'block' => [
					'title' => __( 'Block', 'altis-analytics' ),
					'function' => '\\Altis\\Analytics\\Dashboard\\render_block_column',
				],
				'views' => [
					'title' => __( 'Views', 'altis-analytics' ),
					'function' => '\\Altis\\Analytics\\Dashboard\\render_views',
					'default' => 'DESC',
				],
				'conversion' => [
					'title' => __( 'Conversion Rate', 'altis-analytics' ),
					'function' => '\\Altis\\Analytics\\Dashboard\\render_conversion_rate',
				],
				'author' => [
					'title' => __( 'Author', 'altis-analytics' ),
				],
				'last_modified' => [
					'title' => __( 'Last Modified', 'altis-analytics' ),
					'post_field' => 'post_modified',
				],
			],
		],
		[
			'singular' => __( 'Experience Block', 'altis-analytics' ),
			'plural' => __( 'Experience Blocks', 'altis-analytics' ),
		]
	);

	// Disallow post creation.
	$post_type_object = get_post_type_object( POST_TYPE );
	$post_type_object->cap->create_posts = 'do_not_allow';
}

/**
 * Update the edit post link for XBs to be the parent post.
 *
 * @param string $link The original edit post link.
 * @param int $post_id The post ID.
 *
 * @return string The updated edit post link.
 */
function update_xb_edit_post_link( string $link, int $post_id ) : string {
	if ( get_post_type( $post_id ) !== POST_TYPE ) {
		return $link;
	}

	$parent_id = wp_get_post_parent_id( $post_id );

	// Bail and return an empty string if there was no parent.
	if ( ! $parent_id ) {
		return '';
	}

	$updated_link = add_query_arg( [ 'post' => $parent_id ], $link );

	return $updated_link;
}

/**
 * Adds an experience block category to the block editor.
 *
 * @param array $categories Array of block editor block type categories.
 * @return array The modified block categories array.
 */
function add_block_category( array $categories ) : array {
	array_unshift( $categories, [
		'slug' => 'altis-experience-blocks',
		'title' => __( 'Experience Blocks', 'altis-analytics' ),
	] );

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
 * Fetch a post object by block client ID.
 *
 * @param string $client_id The block client ID.
 * @return WP_Post|null
 */
function get_block_post( string $client_id ) : ?WP_Post {
	static $block_posts = [];

	if ( isset( $block_posts[ $client_id ] ) ) {
		return $block_posts[ $client_id ];
	}

	$query = new WP_Query( [
		'post_type' => POST_TYPE,
		'name' => $client_id,
		'posts_per_page' => 1,
		'no_found_rows' => true,
	] );

	if ( empty( $query->posts ) ) {
		$block_posts[ $client_id ] = null;
		return null;
	}

	// Cache the lookup.
	$block_posts[ $client_id ] = $query->posts[0];

	return $block_posts[ $client_id ];
}

/**
 * Add menu page for Experience Insights.
 *
 * @return void
 */
function add_block_admin_page() {
	$type = get_post_type_object( POST_TYPE );

	add_submenu_page(
		'edit.php?post_type=' . POST_TYPE,
		__( 'Experience Insights', 'altis-analytics' ),
		__( 'Experience Insights', 'altis-analytics' ),
		$type->cap->read,
		'xb-analytics',
		function () {
			$post_id = intval( wp_unslash( $_GET['post'] ?? null ) );
			$client_id = sanitize_key( wp_unslash( $_GET['clientId'] ?? null ) );
			// Check for post ID and map to client ID if missing.
			if ( ! empty( $post_id ) && empty( $client_id ) ) {
				$post = get_post( $post_id );
				if ( $post ) {
					$client_id = $post->post_name;
				}
			}

			// Ensure we have a post.
			if ( empty( $client_id ) ) {
				printf( '<h2>' . esc_html__( 'Experience Block Not Found', 'altis-analytics' ) . '</h2>' );
				return;
			}

			printf(
				'<div class="alignright" style="margin:60px 60px 20px;"><a class="button button-primary" href="%s">%s</a></div>' .
				'<div id="altis-analytics-xb-block" data-client-id="%s">' .
				'<p class="loading" style="margin:60px 60px 20px;"><span class="spinner is-active"></span> %s</p>' .
				'<noscript><div class="error msg">%s</div></noscript>' .
				'</div>',
				esc_attr( admin_url( 'edit.php?post_type=' . POST_TYPE ) ),
				esc_html__( 'Back to all blocks', 'altis-analytics' ),
				esc_attr( $client_id ),
				esc_html__( 'Loading...', 'altis-analytics' ),
				esc_html__( 'JavaScript is required to use the block insights view.', 'altis-analytics' )
			);
		}
	);
}

/**
 * Output markup for the XB block data modal.
 */
function modal_portal() {
	echo '<div id="altis-analytics-xb-block-modal"></div>';
}

/**
 * Register discrete scripts for use in multiple places.
 *
 * @return void
 */
function register_scripts() {
	wp_register_script(
		'altis-analytics-xb-data',
		Utils\get_asset_url( 'blocks/data.js' ),
		[
			'wp-api-fetch',
			'wp-url',
			'wp-data',
		],
		null
	);

	wp_register_script(
		'altis-analytics-xb-ui',
		Utils\get_asset_url( 'blocks/ui.js' ),
		[
			'altis-analytics-xb-data',
			'wp-components',
			'wp-i18n',
			'wp-html-entities',
		],
		null,
		true
	);

	wp_add_inline_script(
		'altis-analytics-xb-ui',
		sprintf(
			'window.Altis = window.Altis || {};' .
			'window.Altis.Analytics = window.Altis.Analytics || {};' .
			'window.Altis.Analytics.Experiments = window.Altis.Analytics.Experiments || {};' .
			'window.Altis.Analytics.Experiments.BuildURL = %s;' .
			'window.Altis.Analytics.Experiments.Goals = %s;',
			wp_json_encode( plugins_url( 'build', Analytics\ROOT_FILE ) ),
			wp_json_encode( (object) Experiments\get_goals() )
		),
		'before'
	);
}

/**
 * Enqueue block UI scripts.
 *
 * @return void
 */
function enqueue_scripts() {
	// Only queue things up by default on the block view pages.
	if ( get_current_screen()->id !== 'admin_page_xb-analytics' ) {
		return;
	}

	wp_enqueue_script( 'altis-analytics-xb-ui' );
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
 * @param array $args Filter args.
 *     - int|null $args['post_id'] An optional post ID to limit results by.
 *     - int $args['days'] The number of days to get data for.
 *     - int $args['offset'] The offset for number of days prior to start query from.
 * @return array|\WP_Error
 */
function get_views( string $block_id, $args = [] ) {
	if ( ! empty( $args ) && is_numeric( $args ) ) {
		_deprecated_argument(
			__FUNCTION__,
			'3.1.0',
			__( 'The $post_id argument has been deprecated in favours of args array. Please use [ \'post_id\' => 123 ] instead.' )
		);
		$args = [ 'post_id' => $args ];
	}

	// Get filter arguments.
	$args = wp_parse_args( $args, [
		'post_id' => null,
		'days' => 7,
		'offset' => 0,
	] );

	$start = time() - ( ( $args['days'] + $args['offset'] ) * DAY_IN_SECONDS );
	$end = time() - ( $args['offset'] * DAY_IN_SECONDS );

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

					// Limit to date range.
					[
						'range' => [
							'event_timestamp' => [
								'gte' => $start * 1000,
								'lt' => $end * 1000,
							],
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
	if ( $args['post_id'] ) {
		// Remove the posts aggregation.
		unset( $query['aggs']['posts'] );

		$query['query']['bool']['filter'][] = [
			'term' => [
				'attributes.postId.keyword' => (string) $args['post_id'],
			],
		];
	}

	$key = sprintf( 'views:%s:%s', $block_id, hash( 'crc32', serialize( $args ) ) );
	$cache = wp_cache_get( $key, 'altis-xbs' );
	if ( $cache ) {
		return $cache;
	}

	$result = Utils\query( $query );

	if ( ! $result ) {
		$data = [
			'start' => date( 'Y-m-d H:i:s', $start ),
			'end' => date( 'Y-m-d H:i:s', $end ),
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
	if ( $args['post_id'] ) {
		$data['post_id'] = $args['post_id'];
	} else {
		$data['posts'] = [];
		foreach ( $result['aggregations']['posts']['buckets'] as $posts_bucket ) {
			$post_metrics = map_aggregations( $posts_bucket['events']['buckets'] );
			$post_metrics = [ 'id' => absint( $posts_bucket['key'] ) ] + $post_metrics;
			$data['posts'][] = $post_metrics;
		}
	}

	$data['start'] = date( 'Y-m-d H:i:s', $start );
	$data['end'] = date( 'Y-m-d H:i:s', $end );

	wp_cache_set( $key, $data, 'altis-xbs', MINUTE_IN_SECONDS * 5 );

	return $data;
}

/**
 * Extract inner blocks from attributes.
 *
 * @param array $block The block configuration.
 * @return array
 */
function ssr_inner_blocks_shim( array $block ) : array {
	if ( $block['blockName'] !== 'altis/shim' ) {
		return $block;
	}

	// Populate inner blocks by parsing content.
	$block['innerBlocks'] = parse_blocks( $block['attrs']['content'] ?? [] );

	// Populate inner content with an array of null placeholders so inner blocks are processed.
	$block['innerContent'] = array_fill( 0, count( $block['innerBlocks'] ), null );

	return $block;
}

/**
 * Registers an inner blocks SSR shim.
 *
 * @return void
 */
function register_ssr_inner_blocks_shim() {
	register_block_type( 'altis/shim', [
		'attributes' => [
			'content' => [
				'type' => 'string',
			],
		],
		'render_callback' => function ( array $attributes, ?string $inner_content ) : string {
			return sprintf( '<div>%s</div>', $inner_content );
		},
	] );
}

/**
 * Register conversion goal validation check.
 *
 * @return void
 */
function check_conversion_goals() {
	$post_types = get_post_types_by_support( 'editor' );
	$post_types = array_filter( $post_types, function ( $post_type ) : bool {
		$post_type_object = get_post_type_object( $post_type );
		return (bool) apply_filters( 'use_block_editor_for_post_type', $post_type_object->show_in_rest, $post_type );
	} );

	PublicationChecklist\register_prepublish_check( 'xbs-valid-conversions', [
		'type' => $post_types,
		'run_check' => function ( array $post ) : Status {
			if ( ! has_blocks( $post['ID'] ) ) {
				return new Status( Status::INFO, __( 'No Experience Blocks found to validate conversion goals against', 'altis-analytics' ) );
			}

			$xbs = find_xbs( parse_blocks( $post['post_content'] ) );

			// No XBs to validate.
			if ( empty( $xbs ) ) {
				return new Status( Status::INFO, __( 'No Experience Blocks found to validate conversion goals against', 'altis-analytics' ) );
			}

			// Track invalid XB variants.
			$invalid = [];

			// Collect invalid XB client IDs and variant indexes.
			foreach ( $xbs as $xb ) {
				foreach ( $xb['innerBlocks'] as $index => $variant ) {
					if ( ! isset( $variant['attrs']['isValid'] ) ) {
						continue;
					}
					if ( $variant['attrs']['isValid'] ) {
						continue;
					}
					if ( ! isset( $invalid[ $xb['attrs']['clientId'] ] ) ) {
						$invalid[ $xb['attrs']['clientId'] ] = [];
					}
					$invalid[ $xb['attrs']['clientId'] ][] = $index;
				}
			}

			if ( empty( $invalid ) ) {
				return new Status( Status::COMPLETE, __( 'Experience Block conversion goals are valid', 'altis-analytics' ) );
			}

			// Check if this will block publishing.
			// In some situations the validation check could be wrong so we shouldn't prevent publication.
			$status = PublicationChecklist\should_block_publish() ? Status::INFO : Status::INCOMPLETE;

			return new Status( $status, __( 'Experience Blocks with invalid conversion goals found', 'altis-analytics' ), $invalid );
		},
	] );

	PublicationChecklist\register_prepublish_check( 'xbs-valid-fallback', [
		'type' => $post_types,
		'run_check' => function ( array $post ) : Status {
			if ( ! has_blocks( $post['ID'] ) ) {
				return new Status( Status::INFO, __( 'No Experience Blocks found to validate fallback content against', 'altis-analytics' ) );
			}

			$xbs = find_xbs( parse_blocks( $post['post_content'] ) );

			// No XBs to validate.
			if ( empty( $xbs ) ) {
				return new Status( Status::INFO, __( 'No Experience Blocks found to validate fallback content against', 'altis-analytics' ) );
			}

			// Track empty fallbacks.
			$empty_fallback = [];

			// Collect XB client IDs with.
			foreach ( $xbs as $xb ) {
				foreach ( $xb['innerBlocks'] as $index => $variant ) {
					if ( ! isset( $variant['attrs']['fallback'] ) ) {
						continue;
					}
					if ( ! $variant['attrs']['fallback'] ) {
						continue;
					}
					if ( ! empty( $variant['innerBlocks'] ) ) {
						continue;
					}
					$empty_fallback[ $xb['attrs']['clientId'] ] = [ $index ];
				}
			}

			if ( empty( $empty_fallback ) ) {
				return new Status( Status::COMPLETE, __( 'Experience Blocks all have fallback content', 'altis-analytics' ) );
			}

			return new Status( Status::INFO, __( 'Experience Blocks without fallback content found', 'altis-analytics' ), $empty_fallback );
		},
	] );
}
