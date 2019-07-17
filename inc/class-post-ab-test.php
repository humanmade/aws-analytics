<?php
/**
 * AB Test class for posts.
 */

namespace HM\Analytics;

class Post_AB_Test extends AB_Test {

	/**
	 * Current post ID for test.
	 *
	 * @var int
	 */
	protected $post_id;

	/**
	 * Creates a new AB Test associated with a post.
	 *
	 * @param string $id A unique ID for the test.
	 */
	public function __construct( string $id ) {
		parent::__construct( $id );
		$this->register_api_fields();
	}

	/**
	 * Register some REST API fields to manage the test configuration through.
	 *
	 * @return void
	 */
	public function register_api_fields() {
		$post_types = get_post_types( [ 'public' => true ] );

		foreach ( $post_types as $post_type ) {
			register_post_meta( $post_type, $this->storage_key . 'paused', [
				'show_in_rest' => true,
				'single' => true,
				'type' => 'integer',
				'schema' => [
					'default' => 1,
				],
			] );
			register_post_meta( $post_type, $this->storage_key . 'start_time', [
				'show_in_rest' => true,
				'single' => true,
				'type' => 'integer',
			] );
			register_post_meta( $post_type, $this->storage_key . 'end_time', [
				'show_in_rest' => true,
				'single' => true,
				'type' => 'integer',
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
				'get_callback' => function () {
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
		}
	}

	/**
	 * Retrieves test data from post meta.
	 *
	 * @param string $sub_key
	 * @return mixed
	 */
	public function get_data( string $sub_key = '' ) {
		$value = get_post_meta( $this->post_id, $this->storage_key . $sub_key, true );

		// Empty string means value not set yet as far as we're concerned.
		if ( $value === '' ) {
			return null;
		}

		return $value;
	}

	/**
	 * Stores test data in post meta.
	 *
	 * @param mixed $data
	 * @param string $sub_key
	 * @return AB_Test
	 */
	public function set_data( $data, string $sub_key = '' ) : AB_Test {
		update_post_meta( $this->post_id, $this->storage_key . $sub_key, $data );
		return $this;
	}

	/**
	 * Set the post ID for use with the storage mechanism and dynamic ID.
	 * Also updates the registered instances for use by cron task.
	 *
	 * @param integer $post_id
	 * @return AB_Test
	 */
	public function set_post( int $post_id ) : AB_Test {
		$this->post_id = $post_id;
		self::$instances[ $this->get_id() ] = $this;
		return $this;
	}

	/**
	 * Return a modified ID with the post ID.
	 *
	 * @return string
	 */
	public function get_id() : string {
		return sprintf( '%s_%d', $this->id, $this->post_id );
	}

}
