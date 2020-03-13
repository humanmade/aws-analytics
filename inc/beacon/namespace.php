<?php
/**
 * Beacon API endpoint for loggin events on window.unload.
 *
 * @package altis-analytics
 */

namespace Altis\Analytics\Beacon;

use Aws\Pinpoint\PinpointClient;
use Exception;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

function setup() {
	// Add a REST API endpoint for sendbeacon support.
	add_action( 'rest_api_init', __NAMESPACE__ . '\\beacon_endpoint' );
}

/**
 * Registers a beacon rest API route to capture and deliver events
 * recorded on window.unload using navigator.sendBeacon.
 *
 * This prevents blocking the unload event for faster browsing.
 */
function beacon_endpoint() {
	register_rest_route( 'analytics/v1', 'beacon', [
		[
			'methods' => WP_REST_Server::CREATABLE,
			'callback' => function ( WP_REST_Request $request ) : WP_REST_Response {
				// Get the users credentials.
				$credentials = $request->get_param( 'credentials' );

				$client_params = [
					'credentials' => [
						'key' => $credentials['AccessKeyId'],
						'secret' => $credentials['SecretKey'],
						'token' => $credentials['SessionToken'],
					],
					'endpoint' => ALTIS_ANALYTICS_PINPOINT_ENDPOINT,
					'region' => ALTIS_ANALYTICS_PINPOINT_REGION,
					'version' => '2016-12-01',
				];

				/**
				 * Pinpoint Client arguments used to putevents from the server side.
				 *
				 * @param array $client_params
				 */
				$client_params = apply_filters( 'altis.analytics.pinpoint_client_params', $client_params );

				try {
					$client = new PinpointClient( $client_params );

					$events = $request->get_param( 'events' );
					$result = $client->putEvents( [
						'ApplicationId' => ALTIS_ANALYTICS_PINPOINT_ID,
						'EventsRequest' => $events,
					] );
					if ( $result['data']['@metadata']['statusCode'] !== 202 ) {
						throw new Exception( sprintf(
							'putEvents request failed with status code %d',
							$result['data']['@metadata']['statusCode']
						) );
					}
					$result = [ 'EventsResponse' => $result['data']['EventsResponse'] ];
				} catch ( Exception $e ) {
					$result = new WP_Error( 'analytics_beacon_put_events_error', $e->getMessage() );
				}

				return rest_ensure_response( $result );
			},
			'args' => [
				'credentials' => [
					'required' => true,
					'type' => 'string',
					'sanitize_callback' => function ( $param ) {
						return json_decode( $param, true );
					},
					'validate_callback' => function ( $param ) {
						$credentials = json_decode( $param, true );

						if ( json_last_error() ) {
							return new WP_Error( 'analytics_beacon_invalid_argument', json_last_error_msg() );
						}

						if ( ! is_array( $credentials ) ) {
							return new WP_Error( 'analytics_beacon_invalid_argument', 'Argument "credentials" must be an object' );
						}

						$errors = [];

						if ( ! isset( $credentials['AccessKeyId'] ) ) {
							$errors = 'AccessKeyId property is missing from credentials';
						}
						if ( ! isset( $credentials['SecretKey'] ) ) {
							$errors = 'SecretKey property is missing from credentials';
						}
						if ( ! isset( $credentials['SessionToken'] ) ) {
							$errors = 'SessionToken property is missing from credentials';
						}
						if ( ! empty( $errors ) ) {
							return new WP_Error( 'analytics_beacon_invalid_argument', implode( "\n", $errors ) );
						}

						return true;
					},
				],
				'events' => [
					'required' => true,
					'type' => 'string',
					'sanitize_callback' => function ( $param ) {
						return json_decode( $param, true );
					},
				],
			],
		],
		'schema' => [
			'type' => 'object',
			'properties' => [
				'EventsResponse' => [
					'type' => 'object',
					'properties' => [
						'Results' => [
							'type' => 'object',
							'patternProperties' => [
								'.*' => [
									'type' => 'object',
									'properties' => [
										'EndpointItemResponse' => [
											'type' => 'object',
											'properties' => [
												'Message' => [ 'type' => 'string' ],
												'StatusCode' => [ 'type' => 'number' ],
											],
										],
										'EventsItemResponse' => [
											'type' => 'object',
											'patternProperties' => [
												'.*' => [
													'type' => 'object',
													'properties' => [
														'Message' => [ 'type' => 'string' ],
														'StatusCode' => [ 'type' => 'number' ],
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
			],
		],
	] );
}
