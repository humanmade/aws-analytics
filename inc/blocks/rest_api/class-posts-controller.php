<?php
/**
 * Audience REST API posts controller.
 *
 * @package altis/aws-analytics
 */

namespace Altis\Analytics\Blocks\REST_API;

use Altis\Analytics\Blocks;
use WP_Error;
use WP_REST_Posts_Controller;
use WP_REST_Server;

/**
 * Audience Posts Controller Class.
 */
class Posts_Controller extends WP_REST_Posts_Controller {

	/**
	 * API constructor.
	 *
	 * @param string $post_type Endpoint base.
	 */
	public function __construct( $post_type ) {
		parent::__construct( $post_type );
		$this->namespace = 'analytics/v1';
	}

	/**
	 * Undocumented function
	 *
	 * @return void
	 */
	public function register_routes() {
		parent::register_routes();

		// Add a route that allows for matching XBs by client ID.
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<id>[a-z\d-]+)',
			[
				'args'   => [
					'id' => [
						'description' => __( 'Unique identifier for the object.' ),
						'type' => 'integer',
					],
				],
				[
					'methods' => WP_REST_Server::READABLE,
					'callback' => [ $this, 'get_item' ],
					'permission_callback' => [ $this, 'get_item_permissions_check' ],
					'args' => [
						'context' => $this->get_context_param( [ 'default' => 'view' ] ),
					],
				],
				[
					'methods' => WP_REST_Server::EDITABLE,
					'callback' => [ $this, 'update_item' ],
					'permission_callback' => [ $this, 'update_item_permissions_check' ],
					'args' => $this->get_endpoint_args_for_item_schema( WP_REST_Server::EDITABLE ),
				],
				[
					'methods' => WP_REST_Server::DELETABLE,
					'callback' => [ $this, 'delete_item' ],
					'permission_callback' => [ $this, 'delete_item_permissions_check' ],
					'args' => [
						'force' => [
							'type' => 'boolean',
							'default' => false,
							'description' => __( 'Whether to bypass Trash and force deletion.' ),
						],
					],
				],
				'schema' => [ $this, 'get_public_item_schema' ],
			]
		);
	}

	/**
	 * Check whether the posts can be read or not.
	 *
	 * @param WP_Post $post The post object to check read permission for.
	 * @return bool
	 */
	public function check_read_permission( $post ) {
		if ( current_user_can( 'read_post', $post->ID ) ) {
			return true;
		}

		return false;
	}

	/**
	 * Checks if a given request has access to read posts.
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return true|WP_Error True if the request has read access, WP_Error object otherwise.
	 */
	public function get_items_permissions_check( $request ) {
		$post_type = get_post_type_object( $this->post_type );

		if ( ! current_user_can( $post_type->cap->read ) ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'Sorry, you are not allowed to view audiences.' ),
				[ 'status' => rest_authorization_required_code() ]
			);
		}

		return true;
	}

	/**
	 * Get the post, if the ID is valid.
	 *
	 * Support XB client ID as well.
	 *
	 * @param int $id Supplied ID.
	 * @return WP_Post|WP_Error Post object if ID is valid, WP_Error otherwise.
	 */
	protected function get_post( $id ) {
		$error = new WP_Error(
			'rest_post_invalid_id',
			__( 'Invalid post ID.' ),
			[ 'status' => 404 ]
		);

		if ( is_numeric( $id ) ) {
			if ( (int) $id <= 0 ) {
				return $error;
			}
			$post = get_post( $id );
		} else {
			$post = Blocks\get_block_post( $id );
		}

		$post = get_post( (int) $id );
		if ( empty( $post ) || empty( $post->ID ) || $this->post_type !== $post->post_type ) {
			return $error;
		}

		return $post;
	}

}
