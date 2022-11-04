<?php
/**
 * Audience REST API posts controller.
 *
 * @package altis/aws-analytics
 */

namespace Altis\Analytics\Blocks\REST_API;

use Altis\Analytics\Blocks;
use Altis\Analytics\Utils;
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
	 * Replace default rest routes for the XBs post type.
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

		// Add a route that allows for matching XBs by client ID. API is read-only.
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

		register_rest_field( Blocks\POST_TYPE, 'subtype', [
			'get_callback' => [ $this, 'get_subtype' ],
			'schema' => [
				'type' => 'string',
				'description' => __( 'The type of experience block', 'altis-analytics' ),
			],
		] );

		register_rest_field( Blocks\POST_TYPE, 'variants', [
			'get_callback' => [ $this, 'get_variants' ],
			'schema' => [
				'type' => 'array',
				'items' => [
					'type' => 'object',
					'properties' => [
						'id' => [ 'type' => 'number' ],
						'fallback' => [ 'type' => 'boolean' ],
						'goal' => [ 'type' => 'string' ],
						'title' => [ 'type' => 'string' ],
						'percent' => [ 'type' => 'number' ],
					],
				],
			],
		] );
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
	 * Add block subtype to API response.
	 *
	 * @param array $post The XB post data array.
	 * @return string|null
	 */
	public function get_subtype( array $post ) : ?string {
		$post = get_post( $post['id'] );
		$blocks = parse_blocks( $post->post_content );
		return $blocks[0]['blockName'] ?? null;
	}

	/**
	 * Add block variants data to API response.
	 *
	 * @param array $post The XB data object.
	 * @return array
	 */
	public function get_variants( array $post ) : array {
		$post = get_post( $post['id'] );
		$variants = [];
		$blocks = parse_blocks( $post->post_content );

		foreach ( $blocks as $block ) {
			foreach ( $block['innerBlocks'] as $id => $variant ) {
				$subtype = str_replace( 'altis/', '', $variant['blockName'] );

				// Handle variant output for different block types.
				switch ( $subtype ) {
					case Blocks\Personalization_Variant\BLOCK:
						if ( isset( $variant['attrs']['audience'] ) ) {
							$audience_id = (int) $variant['attrs']['audience'];
							$variant['attrs']['id'] = $audience_id;
							$variant['attrs']['title'] = get_the_title( $audience_id );
							unset( $variant['attrs']['audience'] );
							$variants[] = $variant['attrs'];
						} else {
							$variant['attrs']['id'] = 0;
							$variant['attrs']['title'] = __( 'Fallback', 'altis-analytics' );
							// Always add the fallback to the start of the array.
							array_unshift( $variants, $variant['attrs'] );
						}
						break;
					default:
						$default_title = sprintf( __( 'Variant %s', 'altis-analytics' ), Utils\get_letter( $id ) );
						$variant['attrs']['id'] = $id;
						$variant['attrs']['title'] = $variant['attrs']['title'] ?? $default_title;
						$variants[] = $variant['attrs'];
				}
			}
		}

		return array_values( $variants );
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
			$post = get_post( (int) $id );
		} else {
			$post = Blocks\get_block_post( $id );
		}

		if ( empty( $post ) || empty( $post->ID ) || $this->post_type !== $post->post_type ) {
			return $error;
		}

		return $post;
	}

	/**
	 * Add custom links to XB post type API data.
	 *
	 * @param WP_Post $post The post object to get links for.
	 * @return array
	 */
	protected function prepare_links( $post ) {
		$links = parent::prepare_links( $post );

		// Override self link.
		$links['self'] = [
			'href' => rest_url( $this->namespace . '/' . $this->rest_base . '/' . $post->post_name ),
		];

		// Add anlaytics data link.
		$links['wp:analytics'] = [
			'href' => rest_url( $this->namespace . '/' . $this->rest_base . '/' . $post->post_name . '/views' ),
			'embeddable' => true,
		];

		return $links;
	}

}
