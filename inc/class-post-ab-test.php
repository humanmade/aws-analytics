<?php
/**
 * AB Test class for posts.
 */

namespace HM\Analytics;

use function HM\Analytics\Helpers\milliseconds;
use WP_Post;

class Post_AB_Test extends AB_Test {

	/**
	 * Current post ID for test.
	 *
	 * @var int
	 */
	protected $post_id;

	/**
	 * REST API Schema for the variant meta data.
	 *
	 * @var array
	 */
	protected $variant_data_schema = [
		'type' => 'string',
	];

	/**
	 * Creates a new AB Test associated with a post.
	 *
	 * @param string $id A unique ID for the test.
	 */
	public function __construct( string $id ) {
		parent::__construct( $id );

		// Ensure the data we need is accessible in the post editor.
		$this->register_api_fields();

		// Hook in to necessary contexts to configure the test object JIT.
		add_action( 'wp', [ $this, 'on_wp' ] );
	}

	/**
	 * Allows setting a custom variant data schema for REST API
	 * responses.
	 *
	 * Examples:
	 *
	 * [ 'type' => 'string' ]
	 *
	 * [
	 *   'type' => 'object',
	 *   'properties' => [
	 *     'id' => [
	 *        'type' => 'integer',
	 *     ],
	 *     'text' => [
	 *        'type' => 'string'
	 *     ],
	 *     'selector' => [
	 *        'type' => 'string'
	 *     ]
	 *   ]
	 * ]
	 *
	 * @param array $schema A valid schema array, at a minimum must contain
	 */
	public function set_variant_data_schema( array $schema ) {
		$this->variant_data_schema = $schema;
	}

	/**
	 * Returns the current variant data schema.
	 *
	 * @return array
	 */
	public function get_variant_data_schema() : array {
		return $this->variant_data_schema;
	}

	/**
	 * Register some REST API fields to manage the test configuration through.
	 */
	public function register_api_fields() {
		$post_types = get_post_types( [ 'public' => true ] );

		foreach ( $post_types as $post_type ) {
			register_post_meta( $post_type, $this->storage_key . 'paused', [
				'show_in_rest' => true,
				'single' => true,
				'type' => 'string',
				'schema' => [
					'default' => 'true',
				],
			] );
			register_post_meta( $post_type, $this->storage_key . 'start_time', [
				'show_in_rest' => true,
				'single' => true,
				'type' => 'integer',
				'schema' => [
					'default' => milliseconds(),
				],
			] );
			register_post_meta( $post_type, $this->storage_key . 'end_time', [
				'show_in_rest' => true,
				'single' => true,
				'type' => 'integer',
				'schema' => [
					'default' => milliseconds() + ( 30 * 24 * 60 * 60 * 1000 ),
				],
			] );
			register_post_meta( $post_type, $this->storage_key . 'traffic_percentage', [
				'show_in_rest' => true,
				'single' => true,
				'type' => 'number',
				'schema' => [
					'default' => 35,
				],
			] );
			register_rest_field( $post_type, $this->storage_key . 'goal', [
				'get_callback' => function ( $post ) {
					$this->set_post_id( $post['id'] );
					$goal = $this->get_data( 'goal' );

					// Sanitize some values for API responses.
					if ( isset( $goal['aggs'] ) ) {
						$goal['aggs'] = array_map( function ( $aggregation ) {
							return (object) $aggregation;
						}, $goal['aggs'] );
					}

					return (object) ( $goal ?: [] );
				},
				'schema' => [
					'type' => 'object',
				],
			] );
			register_rest_field( $post_type, $this->storage_key . 'variants', [
				'get_callback' => function ( $post ) {
					$this->set_post_id( $post['id'] );
					$variants = $this->get_data( 'variants' );
					return (array) ( $variants ?: [] );
				},
				'update_callback' => function ( $value, WP_Post $post ) {
					$this->set_post_id( $post->ID );
					$this->set_data( 'variants', $value );
				},
				'schema' => [
					'type' => 'array',
					'items' => $this->get_variant_data_schema(),
				],
			] );
		}
	}

	/**
	 * Initialise tests on demand client side.
	 */
	public function on_wp() {
		if ( ! isset( $GLOBALS['posts'] ) ) {
			return;
		}

		// Set up tests for the currently visible posts that have them.
		foreach ( $GLOBALS['posts'] as $post ) {
			$this->set_post_id( $post->ID );
			if ( $this->get_data( 'variants' ) ) {
				$this->init();
			}
		}
	}

	/**
	 * Retrieves test data from post meta.
	 *
	 * @param string $key Key to get data from.
	 * @return mixed
	 */
	public function get_data( string $key ) {
		$value = get_post_meta( $this->post_id, $this->storage_key . $key, true );

		// Empty string means value not set yet as far as we're concerned.
		if ( $value === '' ) {
			return null;
		}

		return $value;
	}

	/**
	 * Stores test data in post meta.
	 *
	 * @param string $key Key to save data to.
	 * @param mixed $data The data to store.
	 */
	public function set_data( string $key, $data ) {
		update_post_meta( $this->post_id, $this->storage_key . $key, $data );
	}

	/**
	 * Set the post ID for use with the storage mechanism and dynamic ID.
	 * Also updates the registered instances for use by cron task.
	 *
	 * @param integer $post_id
	 */
	public function set_post_id( int $post_id ) {
		$this->post_id = $post_id;
	}

	/**
	 * Get the assigned post ID.
	 *
	 * @return int
	 */
	public function get_post_id() : int {
		return $this->post_id;
	}

	/**
	 * Return a modified ID with the post ID.
	 *
	 * @return string
	 */
	public function get_id() : string {
		return sprintf( '%s_%d', $this->id, $this->post_id );
	}

	/**
	 * Get the args to pass to the cron task.
	 *
	 * @return array
	 */
	protected function get_cron_args() : array {
		return [
			'id' => $this->id,
			'post_id' => $this->get_post_id(),
		];
	}

	/**
	 * Configure the post ID when running in the cron context.
	 *
	 * @param array $args Cron callback arguments.
	 */
	protected function on_cron( array $args ) {
		$this->set_post_id( $args['post_id'] );
	}

}
