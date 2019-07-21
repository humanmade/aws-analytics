<?php
/**
 * Analytics helpers.
 *
 * @package hm-analytics
 *
 *
 * @TODO:
 * - Analytics ES service client getter
 * -
 */

namespace HM\Analytics;

use WP_Post;

require_once ROOT_DIR . '/inc/helpers.php';

// Include features.
require_once ROOT_DIR . '/inc/features/title_ab_test.php';

function setup() {
	// Load analytics scripts early.
	add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\\enqueue_scripts', 1 );

	add_action( 'rest_api_init', __NAMESPACE__ . '\\register_post_ab_tests_rest_fields' );
	/**
	 * Enable Title AB Tests.
	 *
	 * @param bool $enabled Whether to enable this feature or not.
	 */
	$title_ab_testing = apply_filters( 'hm.analytics.title_ab_test.enabled', true );
	if ( $title_ab_testing ) {
		Features\Title_AB_Test\setup();
	}
}

function get_data_layer() : array {

	// Initialise data array.
	$data = [
		'Endpoint' => [],
		'AppPackageName' => sanitize_key( get_bloginfo('name') ),
		'AppVersion' => '',
		'SiteName' => get_bloginfo('name'),
		'Attributes' => [],
		'Metrics' => [],
	];

	if ( is_user_logged_in() ) {
		$user = wp_get_current_user();
		$data['Endpoint']['User'] = [];
		$data['Endpoint']['User']['UserId'] = $user->get( 'ID' );
		$data['Endpoint']['User']['UserAttributes'] = [
			'Roles' => array_keys( $user->caps ),
		];
	}

	if ( is_front_page() ) {
		$data['Attributes']['frontPage'] = true;
	}

	if ( is_404() ) {
		$data['Attributes']['404'] = true;
	}

	if ( is_singular() ) {
		$data['Attributes']['postType'] = get_queried_object()->post_type;
		$data['Attributes']['postId'] = get_queried_object_id();

		$author = get_user_by( 'id', get_queried_object()->post_author );
		if ( $author ) {
			$data['Attributes']['author'] = $author->get( 'user_nicename' );
			$data['Attributes']['authorId'] = $author->get( 'ID' );
		}
	}

	if ( is_archive() ) {
		$data['Attributes']['archive'] = true;

		if ( is_date() ) {
			$data['Attributes']['archiveType'] = 'date';
			$data['Attributes']['date'] = get_the_date();
		}

		if ( is_search() ) {
			$data['Attributes']['archiveType'] = 'search';
			$data['Attributes']['search'] = get_search_query();
		}

		if ( is_post_type_archive() ) {
			$data['archiveType'] = get_post_type();
		}

		if ( is_tag() || is_category() || is_tax() ) {
			$data['Attributes']['archiveType'] = get_queried_object()->taxonomy;
			$data['Attributes']['term'] = get_queried_object()->slug;
		}

		if ( is_author() ) {
			$data['Attributes']['archiveType'] = 'author';
			$data['Attributes']['author'] = get_queried_object()->user_nicename;
		}
	}

	if ( is_multisite() ) {
		$data['Attributes']['blog'] = home_url();
		$data['Attributes']['network'] = network_home_url();
	}

	/**
	 * Filter the custom analytics endpoint/user data.
	 *
	 * @param array $data
	 */
	$data['Endpoint'] = (object) apply_filters( 'hm.analytics.data.endpoint', $data['Endpoint'] );

	/**
	 * Filter the custom analytics attributes to record with all events.
	 *
	 * @param array $data
	 */
	$data['Attributes'] = (object) apply_filters( 'hm.analytics.data.attributes', $data['Attributes'] );

	/**
	 * Filter the custom analytics variable data.
	 *
	 * @param array $data
	 */
	$data = apply_filters( 'hm.analytics.data', $data );

	return $data;
}

/**
 * Queue up the tracker script and required configuration.
 */
function enqueue_scripts() {
	wp_enqueue_script( 'hm-analytics', plugins_url( 'build/tracker.js', __DIR__ ), [], null, false );
	wp_add_inline_script(
		'hm-analytics',
		sprintf(
			'var HM = HM || {}; HM.Analytics = %s;', wp_json_encode(
				[
					'Config' => [
						'PinpointId' => defined( 'HM_ANALYTICS_PINPOINT_ID' ) ? HM_ANALYTICS_PINPOINT_ID : null,
						'PinpointRegion' => defined( 'HM_ANALYTICS_PINPOINT_REGION' ) ? HM_ANALYTICS_PINPOINT_REGION : null,
						'PinpointEndpoint' => defined( 'HM_ANALYTICS_PINPOINT_ENDPOINT' ) ? HM_ANALYTICS_PINPOINT_ENDPOINT : null,
						'CognitoId' => defined( 'HM_ANALYTICS_COGNITO_ID' ) ? HM_ANALYTICS_COGNITO_ID : null,
						'CognitoRegion' => defined( 'HM_ANALYTICS_COGNITO_REGION' ) ? HM_ANALYTICS_COGNITO_REGION : null,
						'CognitoEndpoint' => defined( 'HM_ANALYTICS_COGNITO_ENDPOINT' ) ? HM_ANALYTICS_COGNITO_ENDPOINT : null,
					],
					'Data' => get_data_layer(),
				]
			)
		),
		'before'
	);
}

function get_post_ab_tests() : array {
	global $post_ab_tests;
	return (array) $post_ab_tests;
}

function get_post_ab_test( string $id ) : array {
	global $post_ab_tests;
	return $post_ab_tests[ $id ];
}

/**
 * Register the rest api field for all the tests on a post.
 */
function register_post_ab_tests_rest_fields() {
	register_rest_field( 'post', 'ab_tests', [
		'get_callback' => function ( $post ) {
			$response = [];

			foreach ( get_post_ab_tests() as $test_id => $test_options ) {
				$response[ $test_id ] = [
					'start_time'         => get_test_start_time_for_post( $test_id, $post['id'] ),
					'end_time'           => get_test_end_time_for_post( $test_id, $post['id'] ),
					'traffic_percentage' => get_test_traffic_percentage_for_post( $test_id, $post['id'] ),
					'paused'             => is_test_paused_for_post( $test_id, $post['id'] ),
				];
			}
			return $response;
		},
		'update_callback' => function ( $value, WP_Post $post ) {
			foreach ( $value as $test_id => $test ) {
				if ( isset( $test['start_time'] ) ) {
					update_test_start_time_for_post( $test_id, $post->ID, $test['start_time'] );
				}
				if ( isset( $test['end_time'] ) ) {
					update_test_end_time_for_post( $test_id, $post->ID, $test['end_time'] );
				}
				if ( isset( $test['traffic_percentage'] ) ) {
					update_test_traffic_percentage_for_post( $test_id, $post->ID, $test['traffic_percentage'] );
				}
				if ( isset( $test['paused'] ) ) {
					update_is_test_paused_for_post( $test_id, $post->ID, $test['paused'] );
				}
			}
		},
	] );
}

/**
 * Register an AB test for post objects.
 *
 * @param string $id
 * @param array $options
 */
function register_post_ab_test( string $id, array $options ) {
	global $post_ab_tests;
	$post_ab_tests[ $id ] = $options;

	register_rest_field(
		'post', $options['rest_api_variants_field'], [
			'get_callback' => function ( $post ) use ( $id ) : array {
				return get_test_variants_for_post( $id, $post['id'] );
			},
			'update_callback' => function ( array $variants, WP_Post $post ) use ( $id ) {
				return update_test_variants_for_post( $id, $post->ID, $variants );
			},
			'schema' => [
				'type' => 'array',
				'items' => [
					'type' => 'string',
				],
			],
		]
	);
}

/**
 * Get all the variants for a given test for a given post.
 *
 * @param string $test_id
 * @param string $post_id
 * @return array
 */
function get_test_variants_for_post( string $test_id, int $post_id ) : array {
	$value = get_post_meta( $post_id, '_hm_analytics_test_' . $test_id . '_variants', true );

	if ( $value ) {
		return $value;
	}

	return [];
}

/**
 * Get the start time for a given test for a given post.
 *
 * @param string $test_id
 * @param string $post_id
 * @return int Timestamp
 */
function get_test_start_time_for_post( string $test_id, int $post_id ) : int {
	return (int) get_post_meta( $post_id, '_hm_analytics_test_' . $test_id . '_start_time', true );
}

/**
 * Get the start time for a given test for a given post.
 *
 * @param string $test_id
 * @param string $post_id
 * @return int Timestamp
 */
function get_test_end_time_for_post( string $test_id, int $post_id ) : int {
	return (int) get_post_meta( $post_id, '_hm_analytics_test_' . $test_id . '_end_time', true );
}

/**
 * Get the percentage of traffic to run the test for.
 *
 * @param string $test_id
 * @param string $post_id
 * @return int A percentage
 */
function get_test_traffic_percentage_for_post( string $test_id, int $post_id ) : int {
	return (int) get_post_meta( $post_id, '_hm_analytics_test_' . $test_id . '_traffic_percentage', true );
}

/**
 * Check if a given test is paused on a post.
 *
 * @param string $test_id
 * @param string $post_id
 * @return bool
 */
function is_test_paused_for_post( string $test_id, int $post_id ) : bool {
	return get_post_meta( $post_id, '_hm_analytics_test_' . $test_id . '_paused', true );
}

/**
 * Update the variants for a test on a given post.
 *
 * @param string $test_id
 * @param string $post_id
 * @param array
 */
function update_test_variants_for_post( string $test_id, int $post_id, array $variants ) {
	return update_post_meta( $post_id, '_hm_analytics_test_' . $test_id . '_variants', $variants );
}

/**
 * Update the start time for a given test for a given post.
 *
 * @param string $test_id
 * @param string $post_id
 */
function update_test_start_time_for_post( string $test_id, int $post_id, int $date ) {
	update_post_meta( $post_id, '_hm_analytics_test_' . $test_id . '_start_time', $date );
}

/**
 * Update the start time for a given test for a given post.
 *
 * @param string $test_id
 * @param string $post_id
 */
function update_test_end_time_for_post( string $test_id, int $post_id, int $date ) : int {
	update_post_meta( $post_id, '_hm_analytics_test_' . $test_id . '_end_time', $date );
}

/**
 * Update the percentage of traffic to run the test for.
 *
 * @param string $test_id
 * @param string $post_id
 */
function update_test_traffic_percentage_for_post( string $test_id, int $post_id, int $percent ) {
	update_post_meta( $post_id, '_hm_analytics_test_' . $test_id . '_traffic_percentage', $percent );
}

/**
 * Check if a given test is paused on a post.
 *
 * @param string $test_id
 * @param string $post_id
 * @return bool
 */
function update_is_test_paused_for_post( string $test_id, int $post_id, bool $is_paused ) {
	update_post_meta( $post_id, '_hm_analytics_test_' . $test_id . '_paused', $is_paused );
}

function is_test_running_for_post( string $test_id, int $post_id ) : bool {
	return (bool) get_test_variants_for_post( $test_id, $post_id );
}

function output_test_html_for_post( string $test_id, int $post_id, string $default_output ) {
	$test = get_post_ab_test( $test_id );
	$variants = get_test_variants_for_post( $test_id, $post_id );
	ob_start();
	?>
	<span
		class="post-ab-test"
		data-test=<?php echo esc_attr( $test_id ) ?>
		data-variants="<?php echo esc_attr( wp_json_encode( $variants ) ) ?>"
		data-traffic-percentage="<?php echo get_test_traffic_percentage_for_post( $test_id, $post_id ) ?>"
		data-post-id="<?php echo esc_attr( $post_id ) ?>"
		data-metric="<?php echo esc_attr( $test['metric'] ) ?>"
	>
		<?php echo $default_output ?>
	</span>
	<?php
	return ob_get_clean();
}

/**
 * Processes the goal configuration, requests analytics data from Elasticsearch
 * and merges it with existing data before performning statistical analysis.
 */
function process_post_ab_test_result( string $test_id, int $post_id ) {
	if ( empty( $this->get_goal() ) ) {
		return;
	}

	// @todo update.

	// Bail if test no longer running.
	if ( ! $this->is_running() ) {
		if ( $this->get_end_time() <= microtime( true ) ) {
			// Pause the test.
			$this->set_data( 'paused', 1 );

			/**
			 * Dispatch action when test has ended.
			 */
			do_action( 'hm.analytics.ab_test.ended', $this );
		}
		return;
	}

	// Get the goal config.
	$goal = $this->get_goal();

	// Get existing data for use with queries.
	$data = $this->get_data( 'goal' );

	// Process event filter.
	$record_filter = wp_parse_args( $goal['query_filter'] ?? [], [
		'filter' => [],
		'should' => [],
		'must' => [],
		'must_not' => [],
	] );

	// Scope to events associated with this test.
	$record_filter['filter'][] = [
		'exists' => [
			'field' => sprintf( "attributes.test_%s.keyword", $this->get_id() ),
		],
	];

	// Add time based filter from last updated timestamp.
	$record_filter['filter'][] = [
		'range' => [
			'event_timestamp' => [
				'gt' => $data['timestamp'] ?? 0,
			],
		],
	];

	// Build conversion filters.
	$conversion_filter = wp_parse_args( $goal['conversion_filter'], [
		'filter' => [],
		'should' => [],
		'must' => [],
		'must_not' => [],
	] );

	// Collect aggregates for statistical analysis.
	$test_aggregation = [
		// Variant buckets.
		"test" => [
			"terms" => [
				"field" => sprintf( "attributes.test_%s.keyword", $this->get_id() ),
			],
			"aggs" => [
				// Conversion events.
				'conversions' => [
					'filter' => [
						'bool' => $conversion_filter,
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
		"timestamp" => [
			"max" => [
				"field" => "event_timestamp",
			],
		],
	];

	$query = [
		"size" => 0,
		"query" => [
			"bool" => $record_filter,
		],
		"aggs" => $test_aggregation,
		"sort" => [
			"event_timestamp" => "desc"
		],
	];

	// Fetch results & exclude underscore prefixed buckets.
	$url = add_query_arg( [
		// Exclude hit data and underscore prefixed aggs.
		'filter_path' => '-hits.hits,-aggregations.**._*',
		// Return aggregation type with keys.
		'typed_keys' => '',
	], get_elasticsearch_url() . '/analytics*/_search' );

	$response = wp_remote_post( $url, [
		'headers' => [
			'Content-Type' => 'application/json',
		],
		'body' => json_encode( $query, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ),
	] );

	if ( wp_remote_retrieve_response_code( $response ) !== 200 || is_wp_error( $response ) ) {
		if ( is_wp_error( $response ) ) {
			trigger_error( sprintf(
				"Analytics: elasticsearch query failed: %s",
				$response->get_error_message()
			), E_USER_WARNING );
		} else {
			trigger_error( sprintf(
				"Analytics: elasticsearch query failed:\n%s\n%s",
				json_encode( $query ),
				wp_remote_retrieve_body( $response )
			), E_USER_WARNING );
		}
		return;
	}

	$json = wp_remote_retrieve_body( $response );
	$result = json_decode( $json, true );

	if ( json_last_error() ) {
		trigger_error( 'Analytics: elasticsearch response could not be decoded.', E_USER_WARNING );
		return;
	}

	// Merge existing data.
	$merged_data = wp_parse_args( $data, [
		'timestamp' => 0,
		'winning' => false,
		'winner' => false,
		'aggs' => [],
		'variants' => [],
	] );

	$merged_data['timestamp'] = max( $merged_data['timestamp'], $result['aggregations']['max#timestamp']['value'] ?? 0 );

	// Sort buckets by variant ID.
	$new_aggs = $result['aggregations']['sterms#test']['buckets'] ?? [];
	$sorted_aggs = array_fill( 0, count( $this->get_variants() ), [] );

	foreach ( $new_aggs as $aggregation ) {
		$sorted_aggs[ $aggregation['key'] ] = $aggregation;
	}

	$merged_data['aggs'] = merge_buckets_aggregates(
		$merged_data['aggs'],
		$sorted_aggs
	);

	// Process for a winner.
	$processed_results = process_results( $merged_data['aggs'] );
	$merged_data = wp_parse_args( $processed_results, $merged_data );

	// Save updated data.
	// $this->set_data( 'goal', $merged_data );
}

/**
 * Process hits & impressions to find a statistically significant winner.
 *
 * @param array $aggregations Results from elasticsearch.
 * @return array Array of winner ID, current winning variant ID and variant stats.
 */
function process_results( array $aggregations ) : array {
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
			'size' => $size,
			'hits' => $hits,
			'rate' => $rate,
			'p' => null,
		];

		// Check if this variant is winning.
		if ( $rate > $max_rate ) {
			$max_rate = $rate;

			// Check sample size is large enough.
			if ( $size * $rate >= 5 && $size * (1 - $rate) >= 5 ) {
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
		if ( ! is_null( $winning_variant['p'] ) && $winning_variant['p'] < 0.01 ) {
			$winner = $winning;
			/**
			 * Dispatch action when winner found.
			 */
			do_action( 'hm.analytics.ab_test.winner_found', $this );
		}
	}

	return [
		'winning' => $winning,
		'winner' => $winner,
		'variants' => $variants,
	];
}

/**
 * Merge aggregations from ES results.
 *
 *
 * @todo work out how to merge percentiles & percentile ranks
 *
 * @param array $current
 * @param array $new
 * @return array
 */
function merge_buckets_aggregates( array $current, array $new, string $bucket_type = '' ) : array {
	$merged = $current;

	foreach ( $new as $key => $value ) {
		if ( is_string( $key ) ) {
			// Get bucket type.
			if ( preg_match( '/^([a-z0-9_-]+)#.*$/', $key, $matches ) ) {
				$bucket_type = $matches[1];
			}

			switch ( $key ) {
				case 'doc_count':
				case 'sum':
				case 'count':
					$merged[ $key ] = ( $current[ $key ] ?? 0 ) + $value;
					break;
				case 'value':
					if ( $bucket_type ) {
						switch ( $bucket_type ) {
							case 'cardinality':
							case 'cumulative_sum':
							case 'sum':
							case 'sum_bucket':
							case 'value_count':
								$merged[ $key ] = ( $current[ $key ] ?? 0 ) + $value;
								break;
							case 'avg':
							case 'avg_bucket':
								$merged[ $key ] = ( ( $current[ $key ] ?? 0 ) + $value ) / 2;
								break;
							case 'min':
							case 'min_bucket':
								$merged[ $key ] = min( $current[ $key ] ?? PHP_INT_MAX, $value );
								break;
							case 'max':
							case 'max_bucket':
								$merged[ $key ] = max( $current[ $key ] ?? PHP_INT_MIN, $value );
								break;
							default:
								$merged[ $key ] = $current[ $key ] ?? 0;
								break;
						}
						// Reset bucket type.
						$bucket_type = '';
					} else {
						$merged[ $key ] = ( $current[ $key ] ?? 0 ) + $value;
					}
					break;
				case 'avg':
					$merged[ $key ] = ( ( $current[ $key ] ?? 0 ) + $value ) / 2;
					break;
				case 'min':
					$merged[ $key ] = min( $current[ $key ] ?? PHP_INT_MAX, $value );
					break;
				case 'max':
					$merged[ $key ] = max( $current[ $key ] ?? PHP_INT_MIN, $value );
					break;
				case 'std_deviation':
					// Calculate composite std dev.
					if ( isset( $new['avg'], $new['count'], $current['std_deviation'], $current['avg'], $current['count'] ) ) {
						$merged[ $key ] = composite_stddev(
							[ $new['avg'], $current['avg'] ],
							[ $value, $current[ $key ] ],
							[ $new['count'], $current['count'] ]
						);
					} else {
						$merged[ $key ] = $value;
					}
					break;
				default:
					$merged[ $key ] = $value;
					break;
			}
		}

		if ( is_array( $value ) ) {
			$merged[ $key ] = merge_buckets_aggregates( $current[ $key ] ?? [], $value, $bucket_type );
		}
	}

	return $merged;
}
