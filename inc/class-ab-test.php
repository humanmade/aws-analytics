<?php
/**
 * Test class, add variations etc to the object.
 *
 */

namespace HM\Analytics;

use function HM\Analytics\Helpers\get_elasticsearch_url;
use function HM\Analytics\Helpers\composite_stddev;
use function HM\Analytics\Helpers\milliseconds;
use MathPHP\Probability\Distribution\Discrete;

class AB_Test {

	/**
	 * A collection of registered test objects.
	 *
	 * @var array
	 */
	protected static $instances = [];

	/**
	 * The unique ID for the test.
	 *
	 * @var string
	 */
	protected $id;

	/**
	 * Currently winning variant ID.
	 *
	 * @var boolean
	 */
	protected $winning = false;

	/**
	 * Winning variant ID.
	 *
	 * @var boolean
	 */
	protected $winner = false;

	/**
	 * Array of variants for the test.
	 *
	 * @var array
	 */
	protected $variants = [];

	/**
	 * Whether the test is paused or not.
	 *
	 * @var boolean
	 */
	protected $paused = true;

	/**
	 * Amount of traffic to apply the test for.
	 *
	 * @var float
	 */
	protected $traffic_percentage = 100.0;

	/**
	 * Start time for the test in milliseconds.
	 *
	 * @var int
	 */
	protected $start_time;

	/**
	 * End time for the test in milliseconds.
	 *
	 * @var int
	 */
	protected $end_time;

	/**
	 * Conversion goal configuration.
	 *
	 * @var array
	 */
	protected $goal;

	/**
	 * Key to fetch and store data against.
	 *
	 * @var string
	 */
	protected $storage_key;

	/**
	 * Cron hook for tests.
	 *
	 * @var string
	 */
	protected $cron_hook = '_hm_analytics_ab_test';

	/**
	 * Callback that gets run after the test setup method has run.
	 *
	 * @var callable
	 */
	protected $on_init_callback;

	/**
	 * Callback that gets run in the cron context before process_goal() is called.
	 *
	 * @var callable
	 */
	protected $on_cron_callback;

	/**
	 * Returns a test instance by ID.
	 *
	 * @param string $id The test instance ID.
	 * @return AB_Test|null
	 */
	public static function get( string $id ) : AB_Test {
		return self::$instances[ $id ] ?? null;
	}

	/**
	 * Creates a new AB Test object.
	 *
	 * @param string $id A unique identifier for the test.
	 */
	public function __construct( string $id ) {
		if ( ! doing_action( 'init' ) ) {
			trigger_error( 'Analytics: New test instances must be created on the "init" hook.', E_USER_WARNING );
			return;
		}

		// Store instances against the class.
		self::$instances[ $id ] = $this;

		// Set the ID.
		$this->id = $id;

		// Set default storage key.
		$this->storage_key = "_hm_analytics_test_{$id}_";
	}

	/**
	 * Set up properties from the data source, register client side
	 * configuration and set up background task.
	 */
	public function init() {
		// Add default control test.
		$this->add_variant();

		// Fetch data and configure test.
		$start_time = absint( $this->get_data( 'start_time' ) );
		$end_time = absint( $this->get_data( 'end_time' ) );
		$traffic_percentage = $this->get_data( 'traffic_percentage' ) ?? 35;
		$paused = ( $this->get_data( 'paused' ) ?? 'true' ) !== 'false';
		$goal = $this->get_data( 'goal' );

		$this->set_start_time( $start_time );
		$this->set_end_time( $end_time );
		$this->set_traffic_percentage( $traffic_percentage );
		$this->pause( $paused );

		if ( $goal && isset( $goal['winner'] ) ) {
			$this->set_winner( $goal['winner'] );
		}

		// Run init callback.
		if ( is_callable( $this->on_init_callback ) ) {
			$check = call_user_func_array( $this->on_init_callback, [ $this ] );
			// Abort set up if init callback returns false.
			if ( $check === false ) {
				// Clear variants for next run.
				$this->variants = [];
				return;
			}
		}

		// Check if test should be run.
		if ( ! $this->is_running() ) {
			// Clear variants for next run.
			$this->variants = [];
			return;
		}

		// Create background task as late as possible.
		add_action( 'shutdown', [ $this, 'create_cron_task' ] );
		add_action( $this->cron_hook, __CLASS__ . '::do_cron_task' );

		// Add test config to front end output.
		$config = $this->to_config();
		add_filter( 'hm.analytics.tests', function ( array $tests ) use ( $config ) : array {
			$tests[] = $config;
			return $tests;
		} );

		// Clear variants for next run.
		$this->variants = [];
	}

	/**
	 * Set a callback for setting up the test.
	 */
	public function on_init( ?callable $callback ) {
		$this->on_init_callback = $callback;
	}

	/**
	 * Returns the test as a config array for client side usage.
	 *
	 * @return array
	 */
	public function to_config() : array {
		$config = [
			'id' => (string) $this->get_id(),
			'winner' => (bool) $this->get_winner(),
			'traffic' => (float) $this->get_traffic_percentage(),
			'variants' => (array) $this->get_variants(),
			'paused' => (bool) $this->is_paused(),
			'startTime' => (int) $this->get_start_time(),
			'endTime' => (int) $this->get_end_time(),
		];

		return $config;
	}

	/**
	 * Get the args to pass to the cron task.
	 *
	 * @return array
	 */
	protected function get_cron_args() : array {
		return [ 'id' => $this->get_id() ];
	}

	/**
	 * Set up the background fetch task for this test.
	 */
	public function create_cron_task() {
		$args = $this->get_cron_args();
		if ( ! wp_next_scheduled( $this->cron_hook, [ $args ] ) ) {
			wp_schedule_event( time(), 'hourly', $this->cron_hook, [ $args ] );
		}
	}

	/**
	 * Cron task handler. Calls $this->process_goal()
	 *
	 * @param array $args Arguments recieved from the cron task.
	 */
	public static function do_cron_task( array $args ) {
		// Get registered instance.
		$test = self::$instances[ $args['id'] ];

		// Run pre-flight hook.
		$test->on_cron( $args );

		// Init test.
		$test->init();

		// Process goals.
		if ( $test && $test->is_running() ) {
			$test->process_goal();
		} else {
			trigger_error( sprintf(
				'Analytics: Test "%s" is not registered while trying to run background task. Make sure it is registered in the `init` action.',
				$args['id']
			), E_USER_WARNING );
		}
	}

	/**
	 * Called prior to running process_goal() in the cron context.
	 * Useful if you need to further configure the object in a sub-class.
	 *
	 * @param array $args Arguments returned from get_cron_args().
	 */
	protected function on_cron( array $args ) {
		// No-op.
	}

	/**
	 * Retrieve data for the test.
	 *
	 * @param string $key Key to save data to.
	 * @return mixed
	 */
	public function get_data( string $key ) {
		return get_option( $this->storage_key . $key, null );
	}

	/**
	 * Set data for the test.
	 *
	 * @param string $key Key to get data from.
	 * @param mixed $data Data to store.
	 * @return AB_Test
	 */
	public function set_data( string $key, $data ) {
		update_option( $this->storage_key . $key, $data );
	}

	/**
	 * Adds a test variant.
	 *
	 * @param array $actions An array of action arrays.
	 */
	public function add_variant( array $actions = [] ) {
		if ( did_action( 'wp_head' ) ) {
			trigger_error( 'Variants must be added before the wp_head action', E_WARNING );
		}

		$sanitized_actions = array_map( [ $this, 'sanitize_action' ], $actions );

		$this->variants[] = [
			'actions' => $sanitized_actions,
		];
	}

	/**
	 * Sanitizes a variant action array.
	 *
	 * @param array $action
	 * @return array
	 */
	protected function sanitize_action( array $action ) : array {
		$action = wp_parse_args( $action, [
			'selector' => '',
			'text' => '',
			'attributes' => [],
			'events' => [],
		] );

		$action['selector'] = sanitize_text_field( $action['selector'] );
		$action['text'] = sanitize_text_field( $action['text'] );
		$action['attributes'] = array_map( 'sanitize_text_field', $action['attributes'] );

		return $action;
	}

	/**
	 * Set the percentage of traffic to test variations against.
	 *
	 * @param float $amount Percentage of traffic to run test for.
	 */
	public function set_traffic_percentage( float $amount = 35.0 ) {
		$this->traffic_percentage = (float) max( 0.0, min( $amount, 100.0 ) );
	}

	/**
	 * Pause the test.
	 */
	public function pause( bool $paused = true ) {
		$this->paused = $paused;
	}

	/**
	 * Get paused status.
	 *
	 * @return bool
	 */
	public function is_paused() : bool {
		return $this->paused;
	}

	/**
	 * Set the time to start running the test and return the winning variant.
	 *
	 * @param integer $timestamp Milliseconds since epoch.
	 */
	public function set_start_time( int $timestamp ) {
		$this->start_time = $timestamp;
	}

	/**
	 * Set the time to stop running the test and return the winning variant.
	 *
	 * @param integer $timestamp Milliseconds since epoch.
	 */
	public function set_end_time( int $timestamp ) {
		$this->end_time = $timestamp;
	}

	/**
	 * Set the winning variant.
	 *
	 * @param integer $id
	 * @return AB_Test
	 */
	public function set_winner( int $id ) {
		$this->winner = $id;
	}

	/**
	 * Get this instance's ID.
	 *
	 * @return string
	 */
	public function get_id() : string {
		return $this->id;
	}

	/**
	 * Returns the variants array for the test.
	 *
	 * @return array
	 */
	public function get_variants() : array {
		return $this->variants;
	}

	/**
	 * Returns traffic percentage to run test against.
	 *
	 * @return float
	 */
	public function get_traffic_percentage() : float {
		return $this->traffic_percentage ?? 100.0;
	}

	/**
	 * Get test start time.
	 *
	 * @return integer Milliseconds since epoch.
	 */
	public function get_start_time() : int {
		return $this->start_time ?: milliseconds();
	}

	/**
	 * Get test end time.
	 *
	 * @return integer Milliseconds since epoch.
	 */
	public function get_end_time() : int {
		return $this->end_time ?: milliseconds() + ( 30 * 24 * 60 * 60 * 1000 );
	}


	/**
	 * Get the winning variant ID.
	 *
	 * @return void
	 */
	public function get_winner() {
		return $this->winner;
	}

	/**
	 * Returns true if the test is not paused, the start time has
	 * passed and the end time has not been reached.
	 *
	 * @return boolean
	 */
	public function is_running() : bool {
		return ! $this->is_paused()
			&& $this->get_start_time() <= milliseconds()
			&& $this->get_end_time() > milliseconds();
	}

	/**
	 * Sets the goal via a query to get the full record set to be examined and a
	 * follow up filter to determine conversions.
	 *
	 * @param string $label
	 * @param array $conversion_filter Filters to narrow down results that count as a conversion.
	 * @param array $query_filter Filters to narrow down the initial result set.
	 * @return AB_Test
	 */
	public function set_goal( string $label, array $conversion_filter, array $query_filter = [] ) {
		$this->goal = [
			'label' => sanitize_text_field( $label ),
			'conversion_filter' => $conversion_filter,
			'query_filter' => $query_filter,
		];
	}

	/**
	 * Returns the goal configuration for this test.
	 *
	 * @return void
	 */
	public function get_goal() {
		return $this->goal;
	}

	/**
	 * Processes the goal configuration, requests analytics data from Elasticsearch
	 * and merges it with existing data before performning statistical analysis.
	 */
	public function process_goal() {
		if ( empty( $this->get_goal() ) ) {
			return;
		}

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

		$merged_data['aggs'] = $this->merge_buckets(
			$merged_data['aggs'],
			$sorted_aggs
		);

		// Process for a winner.
		$processed_results = $this->process_results( $merged_data['aggs'] );
		$merged_data = wp_parse_args( $processed_results, $merged_data );

		// Save updated data.
		$this->set_data( 'goal', $merged_data );
	}

	/**
	 * Process hits & impressions to find a statistically significant winner.
	 *
	 * @param array $aggregations Results from elasticsearch.
	 * @return array Array of winner ID, current winning variant ID and variant stats.
	 */
	protected function process_results( array $aggregations ) : array {
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
	protected function merge_buckets( array $current, array $new, string $bucket_type = '' ) {
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
				$merged[ $key ] = $this->merge_buckets( $current[ $key ] ?? [], $value, $bucket_type );
			}
		}

		return $merged;
	}

}
