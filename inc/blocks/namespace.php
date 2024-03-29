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
	require_once __DIR__ . '/shim/register.php';
	require_once __DIR__ . '/ab-test/register.php';
	require_once __DIR__ . '/ab-test-variant/register.php';
	require_once __DIR__ . '/broadcast/register.php';

	$using_blocks = false;

	// Register blocks.
	if ( Utils\is_feature_enabled( 'audiences' ) ) {
		Personalization\setup();
		Personalization_Variant\setup();
		$using_blocks = true;
	}
	if ( Utils\is_feature_enabled( 'experiments' ) ) {
		AB_Test\setup();
		AB_Test_Variant\setup();
		$using_blocks = true;
	}
	if ( Utils\is_feature_enabled( 'broadcast' ) ) {
		Broadcast\setup();
	}
	if ( $using_blocks ) {
		Shim\setup();
	} else {
		return;
	}

	// Set up the XB shadow post type.
	add_action( 'init', __NAMESPACE__ . '\\register_post_type' );
	add_action( 'save_post', __NAMESPACE__ . '\\on_save_post', 10, 3 );
	add_filter( 'widget_update_callback', __NAMESPACE__ . '\\on_widgets_save', 100, 4 );

	// Register experience block category.
	add_filter( 'block_categories_all', __NAMESPACE__ . '\\add_block_category', 100 );

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

	// Publication checklist integration.
	add_action( 'altis.publication-checklist.register_prepublish_checks', __NAMESPACE__ . '\\check_conversion_goals' );

	// Support excerpts.
	add_filter( 'excerpt_allowed_wrapper_blocks', __NAMESPACE__ . '\\filter_excerpt_allowed_wrapper_blocks' );

	// Analytics dashboard view.
	add_action( 'admin_menu', __NAMESPACE__ . '\\register_admin_page' );
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

	if ( in_array( $post->post_type, [ POST_TYPE, 'revision', 'customize_changeset' ], true ) ) {
		return;
	}

	$post_type_object = get_post_type_object( $post->post_type );
	if ( ! $post_type_object->public && ! $post_type_object->show_in_rest ) {
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

	update_or_create_xb_post( $xbs, $post->post_title, $post_ID, null, 'post' );

}

/**
 * Synchronise any XBs on the widget page with a shadow post type.
 *
 * @param array $instance The array of current widget settings.
 * @param array $new_instance The array of new widget settings.
 * @param array $old_instance The array of old widget settings.
 * @param WP_Widget $widget The current widget instance.
 * @return array $instance The current widget settings.
 */
function on_widgets_save( $instance, $new_instance, $old_instance, $widget ) {

	if ( ! isset( $instance['content'] ) ) {
		return $instance;
	}

	// Scan for XBs in the post content.
	$blocks = parse_blocks( $instance['content'] );
	$xbs = find_xbs( $blocks );

	// Update / Create XB's if the content contains XB's.
	if ( ! empty( $xbs ) ) {
		update_or_create_xb_post( $xbs, __( 'Widget' ), null, $widget->number, 'widget' );
	}

	return $instance;
}

/**
 * Update or create new XB shadow posts.
 *
 * @param array $xbs XBs on page or as widgets.
 * @param string $default_title Default Title title for XB Post.
 * @param int $post_ID Post ID if applicable in use case.
 * @param int $item_id Item ID if applicable in use case.
 * @param string $context Meta Key for updating the post_meta.
 */
function update_or_create_xb_post( array $xbs, string $default_title = '', ?int $post_ID = null, ?int $item_id = null, string $context = 'post' ) {
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

		$xb_title = sprintf( '%s %s %s', $default_title, get_block_type_label( $xb['blockName'] ), $item_id ?: $index + 1 );

		if ( ! isset( $xb['attrs']['title'] ) ) {
			$xb['attrs']['title'] = '';
		}

		if ( empty( $posts ) ) {
			// Create new shadow XB post.
			$xb_post_id = wp_insert_post( [
				'post_type' => POST_TYPE,
				'post_status' => 'publish',
				'post_content' => serialize_block( $xb ),
				'post_name' => $xb['attrs']['clientId'],
				'post_author' => get_current_user_id(),
				'post_title' => $xb['attrs']['title'] ?: $xb_title,
				'post_parent' => $post_ID,
				'meta_input' => [
					'_xb_context' => $context,
					'_xb_context_' . sanitize_key( $context ) => 1,
					'_xb_type' => $xb['blockName'],
					'_xb_type_' . sanitize_key( $xb['blockName'] ) => 1,
				],
			] );

		} else {
			// Update existing post.
			$xb_post_id = $posts[0]->ID;
			wp_update_post( [
				'ID' => $posts[0]->ID,
				'post_content' => serialize_block( $xb ),
				'post_title' => $xb['attrs']['title'] ?: $xb_title,
				'post_parent' => $post_ID,
			] );
		}

		/**
		 * Allow further processing after the XB post is created or updated.
		 *
		 * @param int $post_id The XB post ID.
		 * @param array $xb The unserialised block data.
		 */
		do_action( 'altis.analytics.blocks.save_post', $xb_post_id, $xb );
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
		Personalization\BLOCK,
		AB_Test\BLOCK,
	];
	$xb_types = array_map( function ( $type ) {
		return "altis/{$type}";
	}, $xb_types );

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
			'menu_position' => 200,
			'show_in_rest' => true,
			'show_in_menu' => false,
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
					'function' => '\\Altis\\Analytics\\Insights\\render_block_column',
				],
				'type' => [
					'title' => __( 'Type', 'altis-analytics' ),
					'function' => '\\Altis\\Analytics\\Insights\\render_type_column',
				],
				'views' => [
					'title' => __( 'Views', 'altis-analytics' ),
					'function' => '\\Altis\\Analytics\\Insights\\render_views',
					'default' => 'DESC',
				],
				'conversion' => [
					'title' => __( 'Conversion Rate', 'altis-analytics' ),
					'function' => '\\Altis\\Analytics\\Insights\\render_conversion_rate',
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
 * Get the XB type, excluding the altis/ namespace prefix.
 *
 * Falls back to 'personalization' for backlwards compatibility.
 *
 * @param int|WP_Post $post Post object or ID for the XB.
 * @return string
 */
function get_block_type( $post ) : string {
	$post = get_post( $post );
	$type = get_post_meta( $post->ID, '_xb_type', true ) ?: Personalization\BLOCK;
	return str_replace( 'altis/', '', $type );
}

/**
 * Readable block name based on the XB name.
 *
 * @param string $block_name Name of the XB.
 * @return string
 */
function get_block_type_label( string $block_name ) : string {
	$types = [
		'ab-test' => __( 'A/B Test', 'altis-analytics' ),
		'personalization' => __( 'Personalized Content', 'altis-analytics' ),
	];

	$type = str_replace( 'altis/', '', $block_name );

	return ( $types[ $type ] ?? __( 'Unknown', 'altis-analytics' ) );
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
		'variants' => [],
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

		foreach ( $event_bucket['variants']['buckets'] as $variant_bucket ) {
			if ( ! isset( $data['variants'][ $variant_bucket['key'] ] ) ) {
				$data['variants'][ $variant_bucket['key'] ] = [
					'id' => absint( $variant_bucket['key'] ),
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
			$data['variants'][ $variant_bucket['key'] ][ $key ] = $variant_bucket['doc_count'];
			$data['variants'][ $variant_bucket['key'] ]['unique'][ $key ] = $variant_bucket['uniques']['value'];
		}
	}

	// Ensure audiences key is an array.
	$data['variants'] = array_values( $data['variants'] );

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
 *     - string $args['vary_on'] The field to distinguish variants on.
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

	// Set default vary key for back compat.
	$vary_on = 'attributes.audience.id';

	// Determine index value to get variants on by block type.
	$block_post = get_block_post( $block_id );
	if ( ! empty( $block_post ) ) {
		$block_type = get_block_type( $block_post );
		$block_settings = get_block_settings( $block_type );
		$vary_on = $block_settings['varyOn'] ?? $vary_on;
	}

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
					// Get the split by variant.
					'variants' => [
						'terms' => [
							'field' => $vary_on,
							'order' => [ '_key' => 'asc' ],
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
			// Get the split by post ID and variant.
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
							// Get the split by variant.
							'variants' => [
								'terms' => [
									'field' => $vary_on,
									'order' => [ '_key' => 'asc' ],
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
			'variants' => [],
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
 * Register conversion goal validation check.
 *
 * @return void
 */
function check_conversion_goals() {
	$post_types = get_post_types_by_support( 'editor' );
	$post_types = array_filter( $post_types, function ( $post_type ) : bool {
		$post_type_object = get_post_type_object( $post_type );
		return (bool) $post_type_object->show_in_rest;
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

/**
 * Allow the ab-test and personalization blocks to contribute towards an excerpt.
 *
 * @param array $allowed_blocks The current array of allowed wrapper blocks;
 *
 * @return array The updated wrapper blocks.
 */
function filter_excerpt_allowed_wrapper_blocks( array $allowed_blocks ) : array {
	$allowed_blocks[] = 'altis/ab-test';
	$allowed_blocks[] = 'altis/ab-test-variant';
	$allowed_blocks[] = 'altis/personalization';
	$allowed_blocks[] = 'altis/personalization-variant';

	return $allowed_blocks;
}

/**
 * Adds the admin page.
 *
 * @return void
 */
function register_admin_page() {
	$hook = add_submenu_page(
		'accelerate',
		__( 'Experience Insights', 'altis' ),
		__( 'Insights', 'altis' ),
		'manage_options',
		'edit.php?post_type=xb',
		''
	);
}
