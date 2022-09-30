<?php
/**
 * Broadcasts REST API posts controller.
 *
 * @package altis/aws-analytics
 */

namespace Altis\Analytics\Broadcast;

use WP_REST_Posts_Controller;
use WP_REST_Server;

/**
 * Broadcast Posts Controller Class.
 */
class Posts_Controller extends WP_REST_Posts_Controller {

    /**
	 * API constructor.
	 *
	 * @param string $post_type Endpoint base.
	 */
	public function __construct( $post_type ) {
		parent::__construct( $post_type );
		$this->namespace = 'accelerate/v1';
		$this->rest_base = 'broadcast';
	}

    /**
	 * Replace default rest routes for the Broadcast post type.
	 *
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			[
				[
					'methods' => WP_REST_Server::READABLE,
					'callback' => [ $this, 'get_items' ],
					'permission_callback' => [ $this, 'get_items_permissions_check' ],
					'args' => $this->get_collection_params(),
				],
				'schema' => [ $this, 'get_public_item_schema' ],
			]
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<id>[a-z\d-]+)',
			[
				'args'   => [
					'id' => [
						'description' => __( 'Unique identifier for the object.' ),
						'type' => [ 'integer', 'string' ],
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
				'schema' => [ $this, 'get_public_item_schema' ],
			]
		);
	}
}