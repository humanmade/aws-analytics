<?php
/**
 * A/B Tests.
 *
 * @package aws-analytics
 */

namespace Altis\Analytics\Experiments;

use Altis\Analytics;
use Altis\Analytics\Utils;
use MathPHP\Probability\Distribution\Discrete;
use WP_Post;
use WP_Query;

/**
 * Bootstrap the plugin.
 */
function setup() {

	// Load analytics scripts early.
	add_action( 'altis.analytics.enqueue_scripts', __NAMESPACE__ . '\\enqueue_scripts' );

	// Register REST Fields.
	add_action( 'rest_api_init', __NAMESPACE__ . '\\register_post_ab_tests_rest_fields' );

	// Register REST fields for test variants.
	add_action( 'rest_api_init', __NAMESPACE__ . '\\register_post_ab_tests_variants_rest_fields' );

	// Hook cron task.
	add_action( 'altis_post_ab_test_cron', __NAMESPACE__ . '\\handle_post_ab_test_cron', 10, 2 );

	// Register notifications.
	add_action( 'altis.experiments.test.ended', __NAMESPACE__ . '\\send_post_ab_test_notification', 10, 2 );

	/**
	 * Enable Title AB Tests.
	 *
	 * @param bool $enabled Whether to enable this feature or not.
	 */
	$titles_feature = apply_filters( 'altis.experiments.features.titles', true );
	if ( $titles_feature ) {
		Titles\setup();
	}

	/**
	 * Enable Featured images AB Tests.
	 *
	 * @param bool $enabled Whether to enable this feature or not.
	 */
	$featured_images_feature = apply_filters( 'altis.experiments.features.featured_images', true );
	if ( $featured_images_feature ) {
		FeaturedImages\setup();
	}

	// Register default conversion goals.
	register_goal( 'click_any_link', [
		'label' => __( 'Click on any link', 'altis-analytics' ),
		'event' => 'click',
		'selector' => 'a',
		'validation_message' => __( 'You need to add at least one link to this content to track conversions.', 'altis-anlaytics' ),
	] );
	register_goal( 'submit_form', [
		'label' => __( 'Submit a form', 'altis-analytics' ),
		'event' => 'submit',
		'selector' => 'form',
		'validation_message' => __( 'You need to add a form to this content to track conversions.', 'altis-anlaytics' ),
	] );
}

/**
 * Queue up the tracker script and required configuration.
 */
function enqueue_scripts() {
	global $wp_scripts;

	wp_enqueue_script(
		'altis-experiments',
		Utils\get_asset_url( 'experiments.js' ),
		[
			'altis-analytics',
		],
		null
	);

	wp_add_inline_script(
		'altis-experiments',
		sprintf(
			'window.Altis = window.Altis || {};' .
			'window.Altis.Analytics = window.Altis.Analytics || {};' .
			'window.Altis.Analytics.Experiments = window.Altis.Analytics.Experiments || {};' .
			'window.Altis.Analytics.Experiments.BuildURL = %s;' .
			'window.Altis.Analytics.Experiments.Goals = %s;',
			wp_json_encode( plugins_url( 'build', Analytics\ROOT_FILE ) ),
			wp_json_encode( (object) get_goals() )
		),
		'before'
	);

	// Load async.
	$wp_scripts->add_data( 'altis-experiments', 'async', true );
}

/**
 * Registers a new conversion goal for front end tracking.
 *
 * @param string $name A reference name for the goal.
 * @param array $args An array of configuration options.
 *   - string $args['label'] A human readable label for the goal. Defaults to $name.
 *   - string $args['event'] The JS event to trigger on. Defaults to $name.
 *   - string $args['selector'] An optional CSS selector to scope the event to.
 *   - string $args['closest'] An optional CSS selector for finding the closest matching parent to bind the event to.
 *   - string $args['validation_message'] An optional message to show if the variant is missing the selector.
 * @return void
 */
function register_goal( string $name, array $args = [] ) : void {
	global $altis_analytics_goals;

	if ( ! is_array( $altis_analytics_goals ) ) {
		$altis_analytics_goals = [];
	}

	$args = wp_parse_args( $args, [
		'event' => strtolower( $name ),
		'label' => ucwords( $name ),
		'selector' => null,
		'closest' => null,
	] );

	$altis_analytics_goals[ $name ] = [
		'name' => $name,
		'event' => sanitize_key( $args['event'] ),
		'label' => $args['label'],
		'selector' => $args['selector'],
		'closest' => $args['closest'],
	];

	// Remove key properties from args before appending general args.
	unset( $args['event'] );
	unset( $args['label'] );
	unset( $args['selector'] );
	unset( $args['closest'] );

	$altis_analytics_goals[ $name ]['args'] = $args;
}

/**
 * Returns registered goals.
 *
 * @return array
 */
function get_goals() : array {
	global $altis_analytics_goals;
	return $altis_analytics_goals ?? [];
}

/**
 * Get all registered Post AB Tests.
 *
 * @return array
 */
function get_post_ab_tests() : array {
	global $post_ab_tests;
	return (array) $post_ab_tests;
}

/**
 * Get a registered test by its ID.
 *
 * @param string $test_id The ID of a registered test.
 * @return array
 */
function get_post_ab_test( string $test_id ) : array {
	global $post_ab_tests;
	return $post_ab_tests[ $test_id ];
}

/**
 * Register the rest api field for all the tests on a post.
 */
function register_post_ab_tests_rest_fields() {
	$post_types = get_post_types( [
		'show_in_rest' => true,
	] );

	register_rest_field( $post_types, 'ab_tests', [
		'get_callback' => function ( array $post ) {
			$response = [];
			foreach ( array_keys( get_post_ab_tests() ) as $test_id ) {
				// Skip this test for unsupported types.
				if ( ! in_array( $post['type'], get_post_types_by_support( "altis.experiments.{ $test_id }" ), true ) ) {
					continue;
				}

				$response[ $test_id ] = [
					'started' => is_ab_test_started_for_post( $test_id, $post['id'] ),
					'start_time' => get_ab_test_start_time_for_post( $test_id, $post['id'] ),
					'end_time' => get_ab_test_end_time_for_post( $test_id, $post['id'] ),
					'traffic_percentage' => get_ab_test_traffic_percentage_for_post( $test_id, $post['id'] ),
					'variant_traffic_percentage' => get_ab_test_variant_traffic_percentage_for_post( $test_id, $post['id'] ),
					'paused' => is_ab_test_paused_for_post( $test_id, $post['id'] ),
					'results' => (object) get_ab_test_results_for_post( $test_id, $post['id'] ),
				];
			}
			return (object) $response;
		},
		'update_callback' => function ( $value, WP_Post $post ) {
			foreach ( $value as $test_id => $test ) {
				// Skip this test for unsupported types.
				if ( ! in_array( $post->post_type, get_post_types_by_support( "altis.experiments.{ $test_id }" ), true ) ) {
					continue;
				}

				if ( isset( $test['started'] ) ) {
					update_is_ab_test_started_for_post( $test_id, $post->ID, $test['started'] );
				}
				if ( isset( $test['start_time'] ) ) {
					update_ab_test_start_time_for_post( $test_id, $post->ID, $test['start_time'] );
				}
				if ( isset( $test['end_time'] ) ) {
					update_ab_test_end_time_for_post( $test_id, $post->ID, $test['end_time'] );
				}
				if ( isset( $test['traffic_percentage'] ) ) {
					update_ab_test_traffic_percentage_for_post( $test_id, $post->ID, $test['traffic_percentage'] );
				}
				if ( isset( $test['variant_traffic_percentage'] ) ) {
					update_ab_test_variant_traffic_percentage_for_post( $test_id, $post->ID, $test['variant_traffic_percentage'] );
				}
				if ( isset( $test['paused'] ) ) {
					update_is_ab_test_paused_for_post( $test_id, $post->ID, $test['paused'] );
				}
			}
		},
		'schema' => [
			'type' => 'object',
			'patternProperties' => [
				'.*' => [
					'type' => 'object',
					'properties' => [
						'started' => [
							'type' => 'boolean',
						],
						'start_time' => [
							'type' => 'number',
						],
						'end_time' => [
							'type' => 'number',
						],
						'traffic_percentage' => [
							'type' => 'number',
							'minimum' => 0,
							'maximum' => 100,
						],
						'variant_traffic_percentage' => [
							'type' => 'array',
							'items' => [
								'type' => 'number',
								'minimum' => 0,
								'maximum' => 100,
							],
						],
						'paused' => [
							'type' => 'boolean',
						],
						'results' => [
							'type' => 'object',
							'required' => false,
							'readOnly' => true,
							'properties' => [
								'timestamp' => [
									'type' => 'number',
								],
								'winning' => [
									'type' => [ 'number', 'null' ],
								],
								'winner' => [
									'type' => [ 'number', 'null' ],
								],
								'aggs' => [
									'type' => 'array',
									'items' => [
										'type' => 'object',
									],
								],
								'variants' => [
									'type' => 'array',
									'items' => [
										'type' => 'object',
										'properties' => [
											'value' => [
												'type' => [ 'number', 'string', 'object', 'array' ],
												'description' => __( 'Variant value', 'altis-analytics' ),
											],
											'size' => [
												'type' => 'number',
												'default' => 0,
												'description' => __( 'Variant sample size', 'altis-analytics' ),
											],
											'hits' => [
												'type' => 'number',
												'default' => 0,
												'description' => __( 'Variant conversion count', 'altis-analytics' ),
											],
											'rate' => [
												'type' => 'number',
												'default' => 0,
												'description' => __( 'Variant conversion rate', 'altis-analytics' ),
											],
											'p' => [
												'type' => 'number',
												'default' => 1,
												'description' => __( 'Variant p-value', 'altis-analytics' ),
											],
										],
									],
								],
							],
						],
					],
				],
			],
		],
	] );
}

/**
 * Register an AB test for post objects.
 *
 * @param string $test_id The test name.
 * @param array $options A/B Test configuration options.
 *     $options = [
 *       'label' => (string) A human readable name for the test.
 *       'singular_label' => (string) A human readable name for one instance of the test.
 *       'show_ui' => (boolean) Whether to show this test in the sidebar.
 *       'rest_api_variants_field' => (string) REST API field name to return variants on.
 *       'rest_api_variants_type' => (string) REST API field data type.
 *       'goal' => (string) The event handler.
 *       'closest' => (string) A CSS selector for a parent element to bind the listener to.
 *       'selector' => (string) A CSS selector for children of the current element to bind the listener to.
 *       'variant_callback' => (callable) Callback for providing the variant output.
 *                             Arguments:
 *                               mixed $value The stored variant value.
 *                               int $post_id The post ID.
 *                               array $args Optional arguments passed to `output_ab_test_html_for_post()`
 *       'winner_callback' => (callable) Callback for modifying the post with the winning variant value.
 *                            Arguments:
 *                              int $post_id The post ID.
 *                              mixed $value The stored variant value.
 *       'query_filter' => (array|callable) Elasticsearch bool filter to narrow down overall result set.
 *       'goal_filter' => (array|callable) Elasticsearch bool filter to determine conversion events.
 *       'post_types' => (array) List of supported post types for the test, default to `post` and `page`.
 *     ]
 */
function register_post_ab_test( string $test_id, array $options ) {
	global $post_ab_tests;

	$options = wp_parse_args( $options, [
		'label' => $test_id,
		'singular_label' => $test_id,
		'rest_api_variants_field' => 'ab_test_' . $test_id,
		'rest_api_variants_type' => 'string',
		'goal' => 'click',
		'closest' => '',
		'selector' => '',
		'variant_callback' => function ( $value, int $post_id, array $args ) {
			return $value;
		},
		'winner_callback' => function ( int $post_id, $value ) {
			// Default no-op.
		},
		'query_filter' => [],
		'goal_filter' => [],
		'post_types' => [
			'post',
			'page',
		],
		'show_ui' => false,
		'editor_scripts' => [],
	] );

	/**
	 * Filter test options.
	 *
	 * @param array  $options Test options.
	 * @param string $test_id Test ID.
	 */
	$post_ab_tests[ $test_id ] = apply_filters( 'altis.experiments.test.options', $options, $test_id );

	if ( $options['editor_scripts'] ) {
		add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\\enqueue_experiments_editor_scripts' );
	}

	// Handle post type support filtering and registration.
	foreach ( $options['post_types'] as $post_type ) {
		add_post_type_support( $post_type, "altis.experiments.{ $test_id }" );
	}

	// Bind winner_callback.
	add_action( "altis.experiments.test.winner_found.{$test_id}", $options['winner_callback'], 10, 2 );

	// Set up background task.
	if ( ( ! defined( 'WP_INSTALLING' ) || ! WP_INSTALLING ) && ! wp_next_scheduled( 'altis_post_ab_test_cron', [ $test_id ] ) ) {
		wp_schedule_event( time(), 'hourly', 'altis_post_ab_test_cron', [ $test_id ] );
	}

	/**
	 * Dispatch action when a test is registered.
	 *
	 * @param string $test_id Test ID.
	 * @param array  $options Test options.
	 */
	do_action( 'altis.experiments.test.registered', $test_id, $options );
}

/**
 * Register REST fields for test variants data.
 *
 * @return void
 */
function register_post_ab_tests_variants_rest_fields() {
	global $post_ab_tests;

	foreach ( $post_ab_tests as $test_id => $options ) {
		register_rest_field(
			get_post_types_by_support( "altis.experiments.{ $test_id }" ),
			$options['rest_api_variants_field'],
			[
				'get_callback' => function ( $post ) use ( $test_id ) : array {
					return get_ab_test_variants_for_post( $test_id, $post['id'] );
				},
				'update_callback' => function ( array $variants, WP_Post $post ) use ( $test_id ) {
					return update_ab_test_variants_for_post( $test_id, $post->ID, $variants );
				},
				'schema' => [
					'type' => 'array',
					'items' => [
						'type' => $options['rest_api_variants_type'],
					],
				],
			]
		);
	}
}

/**
 * Register block editor scripts requird for registered tests.
 *
 * @param string $hook Current screen hook.
 *
 * @return void
 */
function enqueue_experiments_editor_scripts( string $hook ) : void {
	global $post_ab_tests;

	if ( ! in_array( $hook, [ 'post.php', 'post-new.php' ], true ) ) {
		return;
	}

	wp_enqueue_script(
		'altis-experiments-features',
		Utils\get_asset_url( 'experiments/sidebar.js' ),
		[
			'wp-plugins',
			'wp-blocks',
			'wp-i18n',
			'wp-editor',
			'wp-components',
			'wp-core-data',
			'wp-edit-post',
			'moment',
		]
	);

	foreach ( $post_ab_tests as $test_id => $test ) {
		if ( empty( $test['editor_scripts'] ) ) {
			continue;
		}

		if ( ! in_array( get_current_screen()->post_type, get_post_types_by_support( "altis.experiments.{ $test_id }" ), true ) ) {
			continue;
		}

		foreach ( $test['editor_scripts'] as $script => $deps ) {
			wp_enqueue_script( "altis-experiments-features-{ $test_id }", $script, array_merge( $deps, [ 'altis-experiments-features' ] ), null );
		}
	}

	$js_data = array_filter( array_map( function( array $test ) {
		return $test['show_ui']
			? array_intersect_key( $test, array_flip( [ 'label', 'singular_label' ] ) )
			: false;
	}, $post_ab_tests ) );

	wp_add_inline_script(
		'altis-experiments-features',
		sprintf(
			'window.Altis = window.Altis || {};' .
			'window.Altis.Analytics = window.Altis.Analytics || {};' .
			'window.Altis.Analytics.Experiments = window.Altis.Analytics.Experiments || {};' .
			'window.Altis.Analytics.Experiments.BuildURL = %s;' .
			'window.Altis.Analytics.Experiments.PostABTests = %s;',
			wp_json_encode( plugins_url( 'build', Analytics\ROOT_FILE ) ),
			wp_json_encode( $js_data )
		),
		'before'
	);
}

/**
 * Dispatches an email notification with a link to the post edit screen.
 *
 * @param string $test_id The test ID.
 * @param integer $post_id The post ID for the test.
 */
function send_post_ab_test_notification( string $test_id, int $post_id ) {
	$test = get_post_ab_test( $test_id );

	// Get post and post author.
	$post = get_post( $post_id );

	$subject = sprintf(
		// translators: %1$s = test name, %2$s = post title.
		__( 'Your test %1$s on "%2$s" has ended', 'altis-analytics' ),
		$test['label'],
		$post->post_title
	);
	$message = sprintf(
		// translators: %s is replaced by an link to edit the post.
		__( "Click the link below to view the results:\n\n%s", 'altis-analytics' ),
		get_edit_post_link( $post_id, 'db' ) . '#experiments-' . $test_id
	);

	/**
	 * Filter the recipients list for the test results.
	 *
	 * @param array $recipients List of user IDs.
	 * @param string $test_id
	 * @param int $post_id
	 */
	$recipients = apply_filters(
		'altis.experiments.test.notification.recipients',
		[ $post->post_author ],
		$test_id,
		$post_id
	);

	foreach ( $recipients as $recipient ) {
		$user = get_user_by( 'id', $recipient );
		if ( ! $user || is_wp_error( $user ) ) {
			continue;
		}

		wp_mail(
			$user->get( 'email' ),
			$subject,
			$message
		);
	}
}

/**
 * Process results for each test.
 *
 * @param string $test_id The test ID.
 * @param int $page Current page of posts to run A/B test cron task for.
 */
function handle_post_ab_test_cron( string $test_id, int $page = 1 ) {
	$test = get_post_ab_test( $test_id );

	$posts_per_page = 50;
	$posts = new WP_Query( [
		'post_type' => get_post_types_by_support( "altis.experiments.{ $test_id }" ),
		'fields' => 'ids',
		'post_status' => [ 'publish', 'inherit' ],
		'posts_per_page' => $posts_per_page,
		'paged' => $page,
		// phpcs:ignore
		'meta_query' => [
			[
				'key' => '_altis_ab_test_' . $test_id . '_variants',
				'compare' => 'EXISTS',
			],
			[
				'key' => '_altis_ab_test_' . $test_id . '_completed',
				'compare' => 'NOT EXISTS',
			],
		],
	] );

	foreach ( $posts->posts as $post_id ) {
		process_post_ab_test_result( $test_id, $post_id );
	}

	// Queue up next batch.
	if ( $posts->found_posts > $page * $posts_per_page ) {
		wp_schedule_single_event( time(), 'altis_post_ab_test_cron', [ $test_id, $page + 1 ] );
	}
}

/**
 * Get all the variants for a given test for a given post.
 *
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to get test data for.
 * @return array
 */
function get_ab_test_variants_for_post( string $test_id, int $post_id ) : array {
	$value = get_post_meta( $post_id, '_altis_ab_test_' . $test_id . '_variants', true );

	if ( $value ) {
		return $value;
	}

	return [];
}

/**
 * Get the start time for a given test for a given post.
 *
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to get test data for.
 * @return int Timestamp
 */
function get_ab_test_start_time_for_post( string $test_id, int $post_id ) : int {
	return (int) get_post_meta( $post_id, '_altis_ab_test_' . $test_id . '_start_time', true ) ?: Utils\milliseconds();
}

/**
 * Get the start time for a given test for a given post.
 *
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to get test data for.
 * @return int Timestamp
 */
function get_ab_test_end_time_for_post( string $test_id, int $post_id ) : int {
	return (int) get_post_meta( $post_id, '_altis_ab_test_' . $test_id . '_end_time', true ) ?: Utils\milliseconds() + ( 30 * 24 * 60 * 60 * 1000 );
}

/**
 * Get whether the test has been started for a given post.
 *
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to get test data for.
 * @return bool
 */
function is_ab_test_started_for_post( string $test_id, int $post_id ) : bool {
	return (bool) get_post_meta( $post_id, '_altis_ab_test_' . $test_id . '_started', true );
}

/**
 * Get the percentage of traffic to run the test for.
 *
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to get test data for.
 * @return int A percentage
 */
function get_ab_test_traffic_percentage_for_post( string $test_id, int $post_id ) : int {
	$traffic_percentage = get_post_meta( $post_id, '_altis_ab_test_' . $test_id . '_traffic_percentage', true );
	return (int) is_numeric( $traffic_percentage ) ? $traffic_percentage : 35;
}

/**
 * Get the percentage of traffic to run the test for.
 *
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to get test data for.
 * @return array $traffic_percent array
 */
function get_ab_test_variant_traffic_percentage_for_post( string $test_id, int $post_id ) : array {
	$traffic_percent = get_post_meta( $post_id, '_altis_ab_test_' . $test_id . '_variant_traffic_percentage', true );
	return is_array( $traffic_percent ) ? $traffic_percent : [];
}

/**
 * Get the percentage of traffic to run the test for.
 *
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to get test data for.
 * @return array Results array
 */
function get_ab_test_results_for_post( string $test_id, int $post_id ) : array {
	$results = get_post_meta( $post_id, '_altis_ab_test_' . $test_id . '_results', true );
	return is_array( $results ) ? $results : [];
}

/**
 * Check if a given test is paused on a post.
 *
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to get test data for.
 * @return bool
 */
function is_ab_test_paused_for_post( string $test_id, int $post_id ) : bool {
	return get_post_meta( $post_id, '_altis_ab_test_' . $test_id . '_paused', true ) !== 'false';
}

/**
 * Check if a given test has ended for a post.
 *
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to get test data for.
 * @return bool
 */
function has_ab_test_ended_for_post( string $test_id, int $post_id ) : bool {
	return ( get_post_meta( $post_id, '_altis_ab_test_' . $test_id . '_ended', true ) ?: 'false' ) !== 'false';
}

/**
 * Update the variants for a test on a given post.
 *
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to set test data for.
 * @param array $variants The new variant data to update.
 * @return bool True if updated successfully.
 */
function update_ab_test_variants_for_post( string $test_id, int $post_id, array $variants ) {
	/**
	 * If the variants have changed we need to reset the current results
	 * except for the last update timestamp.
	 */
	$old_variants = get_ab_test_variants_for_post( $test_id, $post_id );
	$old_variants_cmp = array_map( 'maybe_serialize', $old_variants );
	$variants_cmp = array_map( 'maybe_serialize', $variants );
	if ( ! empty( array_diff( $old_variants_cmp, $variants_cmp ) ) ) {
		$results = get_ab_test_results_for_post( $test_id, $post_id );
		update_ab_test_results_for_post( $test_id, $post_id, [
			'timestamp' => $results['timestamp'] ?? 0,
		] );
	}
	return update_post_meta( $post_id, '_altis_ab_test_' . $test_id . '_variants', $variants );
}

/**
 * Update the start time for a given test for a given post.
 *
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to set test data for.
 * @param int $date Timestamp for when the test started.
 */
function update_ab_test_start_time_for_post( string $test_id, int $post_id, int $date ) {
	update_post_meta( $post_id, '_altis_ab_test_' . $test_id . '_start_time', $date );
}

/**
 * Update the end time for a given test for a given post.
 *
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to set test data for.
 * @param int $date Timestamp for when the test should end.
 */
function update_ab_test_end_time_for_post( string $test_id, int $post_id, int $date ) {
	update_post_meta( $post_id, '_altis_ab_test_' . $test_id . '_end_time', $date );
}

/**
 * Update the whather the test has been started for a given post.
 *
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to set test data for.
 * @param bool $is_started True if the test has started.
 */
function update_is_ab_test_started_for_post( string $test_id, int $post_id, bool $is_started ) {
	update_post_meta( $post_id, '_altis_ab_test_' . $test_id . '_started', $is_started );

	// Remove test ended flag if it hasn't been started yet.
	if ( ! $is_started ) {
		update_has_ab_test_ended_for_post( $test_id, $post_id, false );
	}
}

/**
 * Update the percentage of traffic to run the test for.
 *
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to set test data for.
 * @param int $percent The percentage of traffic to run the test against.
 */
function update_ab_test_traffic_percentage_for_post( string $test_id, int $post_id, int $percent ) {
	update_post_meta( $post_id, '_altis_ab_test_' . $test_id . '_traffic_percentage', $percent );
}

/**
 * Update the percentage of traffic to run for each variant.
 *
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to set test data for.
 * @param float[] $percents Array of percentages of traffic to run for each variant (indexed).
 */
function update_ab_test_variant_traffic_percentage_for_post( string $test_id, int $post_id, array $percents ) {
	// If there are no provided percentages then store an empty array.
	if ( empty( $percents ) ) {
		update_post_meta( $post_id, '_altis_ab_test_' . $test_id . '_variant_traffic_percentage', [] );
		return;
	}
	// Sanitize data.
	$percents = array_map( 'floatval', $percents );
	// If there's some data error then redistribute the percentages.
	// Allow an error margin of 1 below 100 in the calculations to accomodate precision / rounding issues.
	$total = array_sum( $percents );
	if ( $total > 100 || $total < 99 ) {
		$percents = array_fill( 0, count( $percents ), 100 / count( $percents ) );
	}
	$percents = array_values( $percents );
	update_post_meta( $post_id, '_altis_ab_test_' . $test_id . '_variant_traffic_percentage', $percents );
}

/**
 * Update the results for the test.
 *
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to set test data for.
 * @param array $data Test result data.
 */
function update_ab_test_results_for_post( string $test_id, int $post_id, array $data ) {
	update_post_meta( $post_id, '_altis_ab_test_' . $test_id . '_results', $data );
}

/**
 * Update if a given test is paused on a post.
 *
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to set test data for.
 * @param bool $is_paused Set to true to pause the test.
 */
function update_is_ab_test_paused_for_post( string $test_id, int $post_id, bool $is_paused ) {
	update_post_meta( $post_id, '_altis_ab_test_' . $test_id . '_paused', $is_paused ? 'true' : 'false' );
}

/**
 * Update if a given test has ended for a post.
 *
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to set test data for.
 * @param bool $has_ended Set to true to end the test.
 */
function update_has_ab_test_ended_for_post( string $test_id, int $post_id, bool $has_ended ) {
	update_post_meta( $post_id, '_altis_ab_test_' . $test_id . '_ended', $has_ended ? 'true' : 'false' );
}

/**
 * Check if the given test is running or not.
 *
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to get test data for.
 * @return boolean True is the test is currently running.
 */
function is_ab_test_running_for_post( string $test_id, int $post_id ) : bool {
	$has_variants = (bool) get_ab_test_variants_for_post( $test_id, $post_id );
	$is_started = (bool) is_ab_test_started_for_post( $test_id, $post_id );
	$is_paused = (bool) is_ab_test_paused_for_post( $test_id, $post_id );
	$start_time = (int) get_ab_test_start_time_for_post( $test_id, $post_id );
	$end_time = (int) get_ab_test_end_time_for_post( $test_id, $post_id );
	$now = Utils\milliseconds();
	$is_running = $has_variants && $is_started && ! $is_paused && $start_time <= $now && $end_time > $now;
	return $is_running;
}

/**
 * Save completed results for the test to post meta for later reference.
 *
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to set test data for.
 * @param array $data The test results data to save.
 */
function save_ab_test_results_for_post( string $test_id, int $post_id, array $data ) {
	$data = wp_parse_args( $data, [
		'timestamp' => Utils\milliseconds(),
		'winner' => null,
		'variants' => [],
	] );
	update_post_meta( $post_id, '_altis_ab_test_' . $test_id . '_completed', $data );
}

/**
 * Render the AB Test markup for the given test and post.
 *
 * @param string $test_id The current test ID.
 * @param integer $post_id The post ID for the test.
 * @param string $default_output The fallback / control variant output.
 * @param array $args Optional array of args to pass through to the `variant_callback`.
 * @return string|null
 */
function output_ab_test_html_for_post( string $test_id, int $post_id, string $default_output, array $args = [] ) : ?string {
	$test = get_post_ab_test( $test_id );

	// Check post type is supported.
	if ( ! in_array( get_post_type( $post_id ), get_post_types_by_support( "altis.experiments.{ $test_id }" ), true ) ) {
		return $default_output;
	}

	// Get variant data.
	$variants = get_ab_test_variants_for_post( $test_id, $post_id );

	// Check for a winner and return that if present.
	$results = get_ab_test_results_for_post( $test_id, $post_id );
	if ( isset( $results['winner'] ) && $results['winner'] !== null ) {
		if ( $results['winner'] === 0 ) {
			return $default_output;
		}

		$winner = $results['winner'];
		return call_user_func_array(
			$test['variant_callback'],
			[ $variants[ $winner ], $post_id, $args ]
		);
	}

	// Return default value if test is otherwise not running.
	if ( ! is_ab_test_running_for_post( $test_id, $post_id ) ) {
		return $default_output;
	}

	$variant_output = array_map( function ( $variant ) use ( $test, $post_id, $args ) {
		return call_user_func_array( $test['variant_callback'], [ $variant, $post_id, $args ] );
	}, $variants );

	// Generate AB Test markup.
	ob_start();
	?>
	<ab-test
		test-id="<?php echo esc_attr( $test_id ); ?>"
		post-id="<?php echo esc_attr( $post_id ); ?>"
		traffic-percentage="<?php echo esc_attr( get_ab_test_traffic_percentage_for_post( $test_id, $post_id ) ); ?>"
		goal="<?php echo esc_attr( $test['goal'] ); ?>"
		closest="<?php echo esc_attr( $test['closest'] ); ?>"
		fallback="<?php echo esc_attr( $default_output ); ?>"
		variants="<?php echo esc_attr( wp_json_encode( $variant_output, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) ); ?>"
	>
		<?php echo $default_output; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	</ab-test>
	<?php
	return ob_get_clean();
}

/**
 * Processes the goal configuration, requests analytics data from Elasticsearch
 * and merges it with existing data before performning statistical analysis.
 *
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to set test data for.
 * @return void
 */
function process_post_ab_test_result( string $test_id, int $post_id ) {
	$test = get_post_ab_test( $test_id );

	if ( empty( $test ) ) {
		return;
	}

	// Get a unique ID for the test.
	$test_id_with_post = $test_id . '_' . $post_id;

	// Get existing data for use with queries.
	$data = get_ab_test_results_for_post( $test_id, $post_id );

	// End if test no longer running.
	if ( ! is_ab_test_running_for_post( $test_id, $post_id ) ) {
		$should_end = get_ab_test_end_time_for_post( $test_id, $post_id ) <= Utils\milliseconds();
		$has_ended = has_ab_test_ended_for_post( $test_id, $post_id );
		if ( $should_end && ! $has_ended ) {
			end_ab_test_for_post( $test_id, $post_id );
		}
		return;
	}

	// Process event filter.
	if ( is_callable( $test['query_filter'] ) ) {
		$query_filter = call_user_func_array( $test['query_filter'], [ $test_id, $post_id ] );
	} else {
		$query_filter = $test['query_filter'];
	}

	if ( ! is_array( $query_filter ) ) {
		trigger_error( sprintf(
			'AB Tests: Query filter for test %s on post %d is not an array',
			esc_html( $test_id ),
			intval( $post_id )
		), E_USER_WARNING );
		return;
	}

	$query_filter = wp_parse_args( $query_filter, [
		'filter' => [],
		'should' => [],
		'must' => [],
		'must_not' => [],
	] );

	// Scope to events associated with this test.
	$query_filter['filter'][] = [
		'exists' => [
			'field' => sprintf( 'attributes.test_%s.keyword', $test_id_with_post ),
		],
	];

	// Add time based filter from last updated timestamp.
	$query_filter['filter'][] = [
		'range' => [
			'event_timestamp' => [
				'gt' => $data['timestamp'] ?? 0,
			],
		],
	];

	// Build conversion filters.
	if ( is_callable( $test['goal_filter'] ) ) {
		$goal_filter = call_user_func_array( $test['goal_filter'], [ $test_id, $post_id ] );
	} else {
		$goal_filter = $test['goal_filter'];
	}

	if ( ! is_array( $goal_filter ) ) {
		trigger_error( sprintf(
			'AB Tests: Goal filter for test %s on post %d is not an array',
			esc_html( $test_id ),
			intval( $post_id )
		), E_USER_WARNING );
		return;
	}

	$goal_filter = wp_parse_args( $goal_filter, [
		'filter' => [],
		'should' => [],
		'must' => [],
		'must_not' => [],
	] );

	// Filter by the goal event name by default.
	$goal = explode( ':', $test['goal'] ); // Extract the event type and not the selector.
	$goal_filter['filter'][] = [
		'term' => [ 'event_type.keyword' => $goal[0] ],
	];
	$goal_filter['filter'][] = [
		'term' => [ 'attributes.eventTestId.keyword' => $test_id ],
	];
	$goal_filter['filter'][] = [
		'term' => [ 'attributes.eventPostId.keyword' => $post_id ],
	];

	// Collect aggregates for statistical analysis.
	$test_aggregation = [
		// Variant buckets.
		'test' => [
			'terms' => [
				'field' => 'attributes.eventVariantId.keyword',
				'order' => [ '_key' => 'asc' ],
			],
			'aggs' => [
				// Conversion events.
				'conversions' => [
					'filter' => [
						'bool' => $goal_filter,
					],
				],
				// Number of unique page sessions where test is running.
				'impressions' => [
					'cardinality' => [
						'field' => 'attributes.pageSession.keyword',
					],
				],
			],
		],
		'timestamp' => [
			'max' => [
				'field' => 'event_timestamp',
			],
		],
	];

	$query = [
		'size' => 0,
		'query' => [
			'bool' => $query_filter,
		],
		'aggs' => $test_aggregation,
		'sort' => [
			'event_timestamp' => 'desc',
		],
	];

	// Fetch results & exclude underscore prefixed buckets.
	$result = Utils\query( $query, [
		// Exclude hit data and underscore prefixed aggs.
		'filter_path' => '-hits.hits,-aggregations.**._*',
		// Return aggregation type with keys.
		'typed_keys' => '',
		// Cache requests as most indexes are static.
		'request_cache' => 'true',
	] );

	if ( empty( $result ) ) {
		return;
	}

	// Merge existing data.
	$merged_data = wp_parse_args( $data, [
		'timestamp' => 0,
		'winning' => null,
		'winner' => null,
		'aggs' => [],
		'variants' => [],
	] );

	$merged_data['timestamp'] = max(
		$merged_data['timestamp'],
		$result['aggregations']['max#timestamp']['value'] ?? 0
	);

	// Sort buckets by variant ID.
	$variants = get_ab_test_variants_for_post( $test_id, $post_id );
	$new_aggs = $result['aggregations']['sterms#test']['buckets'] ?? [];
	$sorted_aggs = array_fill( 0, count( $variants ), [] );

	foreach ( $new_aggs as $aggregation ) {
		$sorted_aggs[ $aggregation['key'] ] = $aggregation;
	}

	$merged_data['aggs'] = Utils\merge_aggregates(
		$merged_data['aggs'],
		$sorted_aggs
	);

	// Process for a winner.
	$processed_results = analyse_ab_test_results( $merged_data['aggs'], $test_id, $post_id );
	$merged_data = wp_parse_args( $processed_results, $merged_data );

	// Save updated data.
	update_ab_test_results_for_post( $test_id, $post_id, $merged_data );
}

/**
 * Process hits & impressions to find a statistically significant winner.
 *
 * @param array $aggregations Results from elasticsearch.
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to check test data for.
 * @return array Array of winner ID, current winning variant ID and variant stats.
 */
function analyse_ab_test_results( array $aggregations, string $test_id, int $post_id ) : array {
	$variant_values = get_ab_test_variants_for_post( $test_id, $post_id );

	// Track winning variant.
	$winner = false;
	$winning = false;
	$max_rate = 0.0;
	$variants = [];

	foreach ( $aggregations as $id => $agg ) {
		$size = $agg['cardinality#impressions']['value'] ?? 0;
		$hits = $agg['filter#conversions']['doc_count'] ?? 0;
		$rate = $size ? $hits / $size : 0;

		$variants[ $id ] = [
			'value' => $variant_values[ $id ],
			'size' => $size,
			'hits' => $hits,
			'rate' => $rate,
			'p' => null,
		];

		// Check if this variant is winning.
		if ( $rate > $max_rate ) {
			$max_rate = $rate;

			// Check sample size is large enough.
			// We use a low value of 5% as the Minimum Detectable Effect because making the change
			// is automated and therefore cost effective.
			if ( $size * $rate >= 5 && $size * ( 1 - $rate ) >= 5 ) {
				$winning = $id;
			}
		}

		// Get p-value.
		// Compare hit rate of variant against control using discrete binomial distribution.
		// Pass the success rate for this variant to the probability mass function.
		$control = $variants[0];
		$binomial = new Discrete\Binomial( $size, $control['rate'] );
		$variants[ $id ]['p'] = $binomial->pmf( $hits );

	}

	// Find if a variant is winning, ie. reject null hypothesis.
	if ( $winning !== false ) {
		$winning_variant = $variants[ $winning ];
		// Require 99% certainty.
		if ( ! is_null( $winning_variant['p'] ) && $winning_variant['p'] < 0.01 ) {
			$winner = $winning;

			// Store results safely.
			save_ab_test_results_for_post( $test_id, $post_id, [
				'winner' => $winner,
				'variants' => $variants,
			] );

			// End the test.
			end_ab_test_for_post( $test_id, $post_id );

			/**
			 * Dispatch action when winner found.
			 *
			 * @param string $test_id
			 * @param int $post_id
			 */
			do_action( 'altis.experiments.test.winner_found', $test_id, $post_id, $winning_variant['value'] );

			/**
			 * Dispatch action when winner found for test.
			 *
			 * @param int $post_id
			 */
			do_action( "altis.experiments.test.winner_found.{$test_id}", $post_id, $winning_variant['value'] );
		}
	}

	return [
		'winning' => $winning,
		'winner' => $winner,
		'variants' => $variants,
	];
}

/**
 * End the test for the post.
 *
 * @uses do_action( 'altis.experiments.test.ended', $test_id, $post_id );
 * @uses do_action( "altis.experiments.test.ended.{$test_id}", $post_id );
 *
 * @param string $test_id The test ID.
 * @param int $post_id Post ID to end test for.
 */
function end_ab_test_for_post( string $test_id, int $post_id ) {

	// Check ended flag.
	if ( has_ab_test_ended_for_post( $test_id, $post_id ) ) {
		return;
	}

	// Pause the test.
	update_is_ab_test_paused_for_post( $test_id, $post_id, true );

	// End the test.
	update_has_ab_test_ended_for_post( $test_id, $post_id, true );

	// Set end time to now.
	update_ab_test_end_time_for_post( $test_id, $post_id, Utils\milliseconds() );

	/**
	 * Dispatch action when test has ended.
	 *
	 * @param string $test_id The test ID.
	 * @param string $post_id The post ID for the test.
	 * @param array $data The test results so far.
	 */
	do_action( 'altis.experiments.test.ended', $test_id, $post_id );

	/**
	 * Dispatch action when a test of this type has ended.
	 *
	 * @param string $post_id The post ID for the test.
	 * @param array $data The test results so far.
	 */
	do_action( "altis.experiments.test.ended.{$test_id}", $post_id );
}
