import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity-browser/CognitoIdentityClient';
import { GetCredentialsForIdentityCommand } from '@aws-sdk/client-cognito-identity-browser/commands/GetCredentialsForIdentityCommand';
import { GetIdCommand } from '@aws-sdk/client-cognito-identity-browser/commands/GetIdCommand';
import { PutEventsCommand } from '@aws-sdk/client-pinpoint-browser/commands/PutEventsCommand';
import { PinpointClient } from '@aws-sdk/client-pinpoint-browser/PinpointClient';
import { parseQueryString } from '@aws-sdk/querystring-parser';
import merge from 'deepmerge';
import UAParser from 'ua-parser-js';

import {
	getLanguage,
	overwriteMerge,
	prepareAttributes,
	prepareMetrics,
	uuid,
} from './utils';
import './utils/polyfills';

const {
	Config,
	Consent,
	Data,
	Noop,
	Audiences,
} = Altis.Analytics;

if ( ! Config.PinpointId || ! Config.CognitoId ) {
	/* eslint-disable quotes */
	console.warn(
		"Altis Analytics: Missing configuration. \
	You must define the following constants in PHP:\n \
	define( 'ALTIS_ANALYTICS_PINPOINT_ID', '...' );\n \
	define( 'ALTIS_ANALYTICS_PINPOINT_REGION', '...' );\n \
	define( 'ALTIS_ANALYTICS_COGNITO_ID', '...' );\n \
	define( 'ALTIS_ANALYTICS_COGNITO_REGION', '...' );" );
	/* eslint-enable quotes */
}

/**
 * Get consent types.
 *
 * We directly read the cookies rather than use the JS API so this script
 * can load as early as possible.
 */
let hasAnonConsent = Consent.CookiePrefix && document.cookie.match( `${ Consent.CookiePrefix }_statistics-anonymous=allow` );
let hasFullConsent = Consent.CookiePrefix && document.cookie.match( `${ Consent.CookiePrefix }_statistics=allow` );

/**
 * Custom global attributes and metrics, extended by the
 * registerAttribute and registerMetric functions.
 */
const _attributes = {};
const _metrics = {};

/**
 * Page view session.
 */
const pageSession = uuid();

/**
 * Sub-session (visibility changes).
 */
let subSessionId = uuid();
let subSessionStart = Date.now();

/**
 * Time on page.
 */
let start = Date.now();
let elapsed = 0;

/**
 * Scroll depth.
 */
let scrollDepthMax = 0;
let scrollDepthNow = 0;
window.addEventListener( 'scroll', () => {
	const percent = ( window.scrollY / document.body.clientHeight ) * 100;
	scrollDepthMax = percent > scrollDepthMax ? percent : scrollDepthMax;
	scrollDepthNow = percent;
} );

/**
 * Query string parameters.
 */
const params = parseQueryString( window.location.search );
const qvParams = {};
for ( const qv in params ) {
	qvParams[ `qv_${ qv }` ] = params[ qv ] || '';
}

/**
 * Get unique session ID.
 *
 * @returns {?string} The UUID for the current session.
 */
const getSessionID = () => {
	if ( typeof window.sessionStorage === 'undefined' ) {
		return null;
	}

	// Get stored session.
	const sessionID = window.sessionStorage.getItem( '_hm_uuid' );

	if ( sessionID ) {
		return sessionID;
	}

	// Create and set a UUID.
	const newSessionID = uuid();
	window.sessionStorage.setItem( '_hm_uuid', newSessionID );
	return newSessionID;
};

/**
 * Returns current set of default and registered attributes.
 *
 * @param {object} extra Additional attributes to log.
 * @returns {object} Attributes data.
 */
const getAttributes = ( extra = {} ) => ( {
	date: new Date().toISOString(),
	session: getSessionID(),
	pageSession: pageSession,
	url: window.location.origin + window.location.pathname,
	host: window.location.hostname,
	search: window.location.search,
	hash: window.location.hash,
	referer: document.referrer,
	...qvParams,
	...( Data.Attributes || {} ),
	...extra,
	...( _attributes || {} ),
} );

/**
 * Return current set of default and registered metrics.
 *
 * @param {object} extra Additional metrics to log.
 * @returns {object} Metrics data.
 */
const getMetrics = ( extra = {} ) => ( {
	elapsed: elapsed + ( Date.now() - start ),
	scrollDepthMax,
	scrollDepthNow,
	hour: new Date().getHours(),
	day: new Date().getDay() + 1,
	month: new Date().getMonth() + 1,
	year: new Date().getFullYear(),
	...extra,
	...( _metrics || {} ),
} );

/**
 * Initialise cognito services.
 */
const Analytics = {
	keys: {
		UserId: `aws.cognito.identity-id.${ Config.CognitoId }`,
		UserCredentials: `aws.cognito.identity-credentials.${ Config.CognitoId }`,
	},
	/**
	 * Get the cognito user ID.
	 *
	 * @returns {?string} The cognito user UUID.
	 */
	getUserId: () => localStorage.getItem( Analytics.keys.UserId ),
	/**
	 * Get the user credentials object.
	 *
	 * @returns {object|boolean} The user credentials object or false if it doesn't exist.
	 */
	getUserCredentials: () => {
		try {
			const ParsedCredentials = JSON.parse( localStorage.getItem( Analytics.keys.UserCredentials ) );
			if ( new Date( ParsedCredentials.Credentials.Expiration ).getTime() > Date.now() ) {
				return ParsedCredentials;
			}
			return false;
		} catch ( error ) {
			return false;
		}
	},
	/**
	 * Set the user ID.
	 *
	 * @param {string} id The user UUID string.
	 * @returns {boolean} True if updated successfully.
	 */
	setUserId: id => localStorage.setItem( Analytics.keys.UserId, id ),
	/**
	 * Set the user credntials object.
	 *
	 * @param {object} credentials Credentials object from cognito.
	 * @returns {boolean} True if updated successfully.
	 */
	setUserCredentials: credentials => localStorage.setItem( Analytics.keys.UserCredentials, JSON.stringify( credentials ) ),
	/**
	 * Authenticates the current user.
	 *
	 * @returns {object|boolean} User credentials object on success or false otherwise.
	 */
	authenticate: async () => {
		// Get user credentials from cache.
		let UserId = Analytics.getUserId();
		let UserCredentials = Analytics.getUserCredentials();
		if ( UserCredentials && UserCredentials.Credentials ) {
			return UserCredentials.Credentials;
		}

		// Configure Cognito client.
		const params = {
			region: Config.CognitoRegion,
			credentials: {},
		};
		if ( Config.CognitoEndpoint ) {
			params.endpoint = Config.CognitoEndpoint;
		}
		const client = new CognitoIdentityClient( params );

		// Get unique ID if not set.
		if ( ! UserId ) {
			try {
				const getIdCommand = new GetIdCommand( { IdentityPoolId: Config.CognitoId } );
				const result = await client.send( getIdCommand );
				UserId = result.IdentityId;
				Analytics.setUserId( UserId );
			} catch ( error ) {
				console.error( error );
			}
		}

		// Get credentials for user from Cognito.
		try {
			const getCredentialsCommand = new GetCredentialsForIdentityCommand( { IdentityId: UserId } );
			const result = await client.send( getCredentialsCommand );
			UserCredentials = result;
			Analytics.setUserCredentials( UserCredentials );
			return UserCredentials.Credentials;
		} catch ( error ) {
			console.error( error );
		}
		return false;
	},
	/**
	 * Gets the AWS SDK client object.
	 *
	 * @returns {Promise|PinpointClient} Returns a promise for the client or the client itself.
	 */
	getClient: async () => {
		if ( Analytics.client ) {
			return await Analytics.client;
		}

		// Ensure repeat calls wait for the same promise.
		Analytics.client = ( async () => {
			// Get user credentials for pinpoint client.
			const Credentials = await Analytics.authenticate();
			if ( ! Credentials ) {
				console.error( 'Credentials not found.' );
				return;
			}

			// Configure client.
			const params = {
				region: Config.PinpointRegion,
				credentials: {
					accessKeyId: Credentials.AccessKeyId,
					secretAccessKey: Credentials.SecretKey,
					expiration: Credentials.Expiration,
					sessionToken: Credentials.SessionToken,
				},
			};
			if ( Config.PinpointEndpoint ) {
				params.endpoint = Config.PinpointEndpoint;
			}
			const client = new PinpointClient( params );
			Analytics.client = client;
			return client;
		} )();

		return await Analytics.client;
	},
	audiences: [],
	/**
	 * Sets the currently matched audiences based on client side data.
	 */
	updateAudiences: async () => {
		// Take a clone of the current audiences to check if they changed later.
		const oldAudienceIds = Analytics.audiences.slice().sort();

		// Get attributes.
		const attributes = await prepareAttributes( getAttributes() );
		// Get metrics.
		const metrics = await prepareMetrics( getMetrics() );
		// Get endpoint.
		const endpoint = Analytics.getEndpoint();

		// Aggregate data into a queryable object.
		const fieldData = {
			attributes,
			metrics,
			endpoint,
		};

		// Store derived field values for quicker lookups.
		const fieldValues = {};

		// Audience ID store.
		const audienceIds = [];

		// Map audience configurations to IDs.
		for ( const aid in Audiences ) {
			const { id, config } = Audiences[ aid ];

			// Set to true if we need match all groups.
			// - If any rule fails we set this to false and break.
			// Set to false if we want to match any group.
			// - If any rule passes we set this to true and break.
			let audienceMatched = config.include === 'all';

			for ( const gid in config.groups ) {
				const group = config.groups[ gid ];

				// Set to true if we need match all rules.
				// - If any rule fails we set this to false and break.
				// Set to false if we want to match any rule.
				// - If any rule passes we set this to true and break.
				let groupMatched = group.include === 'all';

				for ( const rid in group.rules ) {
					const { field, operator, value } = group.rules[ rid ];

					// Ignore rules with empty field names.
					if ( field === '' ) {
						continue;
					}

					// Track whether the rule matches.
					let ruleMatch = false;

					// Find the field value via dot notation.
					let currentValues = fieldValues[ field ] ||
						field.split( '.' ).reduce( ( carry, prop ) => {
							return carry[ prop ] ?? null;
						}, fieldData );

					// Compat for non array values like endpoint.Demographic properties.
					if ( ! Array.isArray( currentValues ) ) {
						currentValues = [ currentValues ];
					}

					fieldValues[ field ] = currentValues;

					// Compare values.
					for ( const vid in currentValues ) {
						const currentValue = currentValues[ vid ];

						if ( operator === '=' ) {
							ruleMatch = currentValue === value;
						}
						if ( operator === '!=' ) {
							ruleMatch = currentValue !== value;
						}

						// Null values in the endpoint not supported from this point.
						if ( currentValue === null ) {
							break;
						}

						if ( operator === '*=' ) {
							ruleMatch = currentValue.indexOf( value ) > -1;
						}
						if ( operator === '!*' ) {
							ruleMatch = currentValue.indexOf( value ) === -1;
						}
						if ( operator === '^=' ) {
							ruleMatch = currentValue.indexOf( value ) === 0;
						}

						// Don't compare numeric values against `null`.
						if ( value === null ) {
							break;
						}

						if ( operator === 'gte' ) {
							ruleMatch = Number( currentValue ) >= Number( value );
						}
						if ( operator === 'lte' ) {
							ruleMatch = Number( currentValue ) <= Number( value );
						}
						if ( operator === 'gt' ) {
							ruleMatch = Number( currentValue ) > Number( value );
						}
						if ( operator === 'lt' ) {
							ruleMatch = Number( currentValue ) < Number( value );
						}

						// Elasticsearch will match any value stored against a key so if ruleMatch
						// is already true we don't want to reset it.
						if ( ruleMatch ) {
							break;
						}
					}

					// Determine if the group matched depending on the include rule.
					if ( group.include === 'any' && ruleMatch ) {
						groupMatched = true;
						break;
					}
					if ( group.include === 'all' && ! ruleMatch ) {
						groupMatched = false;
						break;
					}
				}

				// Determine if the audience matched depending on the group include rule.
				if ( config.include === 'any' && groupMatched ) {
					audienceMatched = true;
					break;
				}
				if ( config.include === 'all' && ! groupMatched ) {
					audienceMatched = false;
					break;
				}
			}

			if ( audienceMatched ) {
				audienceIds.push( id );
			}
		}

		Analytics.audiences = audienceIds;

		// Trigger an event when audiences are modified.
		if ( audienceIds.sort().toString() !== oldAudienceIds.toString() ) {
			const updateAudiencesEvent = new CustomEvent( 'altis.analytics.updateAudiences', {
				detail: audienceIds,
			} );
			window.dispatchEvent( updateAudiencesEvent );
		}
	},
	/**
	 * Overrides matched audiences.
	 *
	 * @param {Array} ids Audience IDs to override the amtched ones with.
	 */
	overrideAudiences: ids => {
		// Take a clone of the current audiences to check if they changed later.
		const oldAudienceIds = Analytics.audiences.slice().sort();
		Analytics.audiences = ids;

		// Trigger an event when audiences are modified.
		if ( ids.sort().toString() !== oldAudienceIds.toString() ) {
			const updateAudiencesEvent = new CustomEvent( 'altis.analytics.updateAudiences', {
				detail: ids,
			} );
			window.dispatchEvent( updateAudiencesEvent );
		}
	},
	/**
	 * Retrieve current matched audience IDs.
	 *
	 * @returns {Array} Audience IDs.
	 */
	getAudiences: () => {
		return Analytics.audiences;
	},
	/**
	 * Updates the Pinpoint endpoint data.
	 *
	 * @param {object} endpoint The endpoint object with updates.
	 * @returns {Promise} Update Promise.
	 */
	updateEndpoint: async ( endpoint = {} ) => {
		return await Analytics.flushEvents( endpoint );
	},
	/**
	 * Retrieves the current endpoint data.
	 *
	 * @returns {object} Endpoint object.
	 */
	getEndpoint: () => {
		try {
			const ParsedEndpoint = JSON.parse( localStorage.getItem( 'aws.pinpoint.endpoint' ) );
			return ParsedEndpoint || {};
		} catch ( error ) {
			return {};
		}
	},
	/**
	 * Stores endpoint data.
	 *
	 * @param {object} endpoint The endpoint object.
	 */
	setEndpoint: endpoint => {
		localStorage.setItem( 'aws.pinpoint.endpoint', JSON.stringify( endpoint ) );
	},
	/**
	 * Add an analytics event listener.
	 *
	 * @param {string} event The event name.
	 * @param {Function} callback Callback to run on the event.
	 * @returns {EventListener} The event listener handle.
	 */
	on: ( event, callback ) => {
		return window.addEventListener( `altis.analytics.${event}`, event => callback( event.detail ) );
	},
	/**
	 * Removes an event listener.
	 *
	 * @param {EventListener} listener The event listener to remove.
	 */
	off: listener => {
		window.removeEventListener( listener );
	},
	/**
	 * Merge current endpoint data with new.
	 *
	 * @param {object} endpoint The new endpoint data to merge.
	 * @returns {object} The updated endpoint data.
	 */
	mergeEndpointData: async ( endpoint = {} ) => {
		const Existing = Analytics.getEndpoint();
		const UAData = UAParser( navigator.userAgent );
		const EndpointData = {
			Attributes: {},
			Demographic: {
				AppVersion: Data.AppVersion || '',
				Locale: getLanguage(),
			},
			Location: {},
			Metrics: {},
		};

		// Add device attributes.
		if ( UAData.device && UAData.device.vendor ) {
			EndpointData.Attributes.DeviceMake = [ UAData.device.vendor ];
		}
		if ( UAData.device && UAData.device.model ) {
			EndpointData.Attributes.DeviceModel = [ UAData.device.model ];
		}
		if ( UAData.device && UAData.device.type ) {
			EndpointData.Attributes.DeviceType = [ UAData.device.type ];
		}

		// Add demographic data.
		if ( UAData.engine && UAData.engine.name ) {
			EndpointData.Demographic.Make = UAData.engine.name;
		}
		if ( UAData.browser && UAData.browser.name ) {
			EndpointData.Demographic.Model = UAData.browser.name;
		}
		if ( UAData.browser && UAData.browser.version ) {
			EndpointData.Demographic.ModelVersion = UAData.browser.version;
		}
		if ( UAData.os && UAData.os.name ) {
			EndpointData.Demographic.Platform = UAData.os.name;
		}
		if ( UAData.os && UAData.os.version ) {
			EndpointData.Demographic.PlatformVersion = UAData.os.version;
		}

		// Merge new endpoint data with defaults.
		endpoint = merge.all( [ EndpointData, Existing, endpoint ], {
			arrayMerge: overwriteMerge,
		} );

		// Sanitise attributes and metrics.
		if ( endpoint.User && endpoint.User.UserAttributes ) {
			endpoint.User.UserAttributes = await prepareAttributes( endpoint.User.UserAttributes, true );
		}
		endpoint.Attributes = await prepareAttributes( endpoint.Attributes, true );
		endpoint.Metrics = await prepareMetrics( endpoint.Metrics );

		// Add session and page view counts to endpoint.
		if ( ! endpoint.Attributes.lastSession ) {
			endpoint.Attributes.lastSession = [ getSessionID() ];
			endpoint.Attributes.lastPageSession = [ pageSession ];
			endpoint.Metrics.sessions = 1.0;
			endpoint.Metrics.pageViews = 1.0;
		} else {
			// Increment sessions.
			if ( endpoint.Attributes.lastSession[0] !== getSessionID() ) {
				endpoint.Attributes.lastSession = [ getSessionID() ];
				endpoint.Metrics.sessions += 1.0;
			}
			// Increment pageViews.
			if ( endpoint.Attributes.lastPageSession[0] !== pageSession ) {
				endpoint.Attributes.lastPageSession = [ pageSession ];
				endpoint.Metrics.pageViews += 1.0;
			}
		}

		// Add persistent referer tracking for external sources.
		if ( document.referer && document.referrer.indexOf( window.location.hostname ) === -1 ) {
			if ( ! endpoint.Attributes.initialReferer ) {
				endpoint.Attributes.initialReferer = [ document.referer ];
			}
			if ( ! endpoint.Attributes.referer ) {
				endpoint.Attributes.referer = [ document.referer ];
			} else if ( endpoint.Attributes.referer.indexOf( document.referer ) === -1 ) {
				endpoint.Attributes.referer.push( document.referer );
			}
		}

		// Add persistent UTM campaign tracking.
		for ( const qv in params ) {
			const param = qv.toLowerCase();
			if ( ! param.match( /^utm_/ ) ) {
				continue;
			}
			if ( ! endpoint.Attributes[ `initial_${ param }`] ) {
				endpoint.Attributes[ `initial_${ param }` ] = [ params[ param ] ];
			}
			if ( ! endpoint.Attributes[ param ] ) {
				endpoint.Attributes[ param ] = [ params[ param ] ];
			} else if ( endpoint.Attributes[ param ].indexOf( params[ param ] ) === -1 ) {
				endpoint.Attributes[ param ].push( params[ param ] );
			}
		}

		// Strip user data if full consent not given.
		if ( ! hasFullConsent ) {
			delete endpoint.User;
		}

		// Store the endpoint data.
		Analytics.setEndpoint( endpoint );

		// Trigger endpoint update event.
		const updateEndpointEvent = new CustomEvent( 'altis.analytics.updateEndpoint', {
			detail: endpoint,
		} );
		window.dispatchEvent( updateEndpointEvent );

		// Update audience definitions.
		await Analytics.updateAudiences();

		return endpoint;
	},
	events: [],
	/**
	 * Log an event to AWS Pinpoint.
	 *
	 * @param {string} type The event type.
	 * @param {object} data The event data.
	 * @param {object} endpoint Updated endpoint data.
	 * @param {boolean} queue True if event recording can be queued.
	 */
	record: async ( type, data = {}, endpoint = {}, queue = true ) => {
		// Back compat, if data or endpoint is a boolean it is expected to be the value for queue.
		if ( typeof data === 'boolean' ) {
			queue = data;
			data = {};
		}
		if ( typeof endpoint === 'boolean' ) {
			queue = endpoint;
			endpoint = {};
		}

		// Merge endpoint data.
		if ( Object.entries( endpoint ).length ) {
			await Analytics.mergeEndpointData( endpoint );
		}

		// Merge in registered metrics and attributes.
		const attributes = getAttributes( data.attributes || {} );
		const metrics = getMetrics( data.metrics || {} );

		const preparedData = {
			attributes: await prepareAttributes( attributes ),
			metrics: await prepareMetrics( metrics ),
		};

		const EventId = uuid();
		const Event = {
			[ EventId ]: {
				EventType: type /* required */,
				Timestamp: new Date().toISOString(),
				AppPackageName: Data.AppPackageName || '',
				AppTitle: Data.SiteName || '',
				AppVersionCode: Data.AppVersion || '',
				Attributes: preparedData.attributes,
				Metrics: preparedData.metrics,
				Session: {
					Id: subSessionId /* required */,
					StartTimestamp: new Date( subSessionStart ).toISOString(), /* required */
				},
			},
		};

		// Add session stop parameters.
		if ( type === '_session.stop' ) {
			Event[ EventId ].Session.Duration = Date.now() - subSessionStart;
			Event[ EventId ].Session.StopTimestamp = new Date().toISOString();
		}

		// Store sent events.
		Analytics.events.push( Event );

		// Trigger event recorded event.
		const recordEvent = new CustomEvent( 'altis.analytics.record', {
			detail: Event,
		} );
		window.dispatchEvent( recordEvent );

		// Flush the events if we don't want to queue.
		if ( ! queue ) {
			Analytics.flushEvents();
			return;
		}

		if ( Analytics.timer ) {
			clearTimeout( Analytics.timer );
		}

		// Flush new events after 5 seconds.
		Analytics.timer = setTimeout( Analytics.flushEvents, 5000 );
	},
	/**
	 * Send events to Pinpoint.
	 *
	 * @param {object} endpoint Optional updated endpoint data.
	 */
	flushEvents: async ( endpoint = {} ) => {
		// Get the client.
		const client = await Analytics.getClient();

		// Events are associated with an endpoint.
		const UserId = Analytics.getUserId();
		if ( ! UserId ) {
			console.error( 'No User ID found. Make sure to call Analytics.authenticate() first.' );
			return;
		}

		// Update endpoint data if provided.
		if ( Object.entries( endpoint ).length ) {
			await Analytics.mergeEndpointData( endpoint );
		}

		// Build endpoint data.
		const Endpoint = Analytics.getEndpoint();
		Endpoint.RequestId = uuid();

		// Reduce events to an object keyed by event ID.
		const Events = Analytics.events.reduce( ( carry, event ) => ( {
			...event,
			...carry,
		} ), {} );

		// Build events request object.
		const BatchUserId = UserId.replace( `${ Config.CognitoRegion }:`, '' );
		const EventsRequest = {
			BatchItem: {
				[ BatchUserId ]: {
					Endpoint: Endpoint,
					Events: Events,
				},
			},
		};

		try {
			const command = new PutEventsCommand( {
				ApplicationId: Config.PinpointId,
				EventsRequest: EventsRequest,
			} );

			// If event delivery is enabled.
			if ( ! Noop ) {
				await client.send( command );
			}

			// Clear events on success.
			Analytics.events = [];
		} catch ( error ) {
			console.error( error );
		}
	},
};

// Expose userland API.
Altis.Analytics.updateEndpoint = Analytics.updateEndpoint;
Altis.Analytics.getEndpoint = Analytics.getEndpoint;
Altis.Analytics.getAudiences = Analytics.getAudiences;
Altis.Analytics.overrideAudiences = Analytics.overrideAudiences;
Altis.Analytics.on = Analytics.on;
Altis.Analytics.off = Analytics.off;
Altis.Analytics.record = Analytics.record;

/**
 * Add a default attribute for all events.
 *
 * @param {string} name The attribute name.
 * @param {*} value The attribute value, can be a string, or callback or Promise that returns a string.
 */
Altis.Analytics.registerAttribute = ( name, value ) => {
	_attributes[ name ] = value;
	Analytics.updateAudiences();
};

/**
 * Add a default metric for all events.
 *
 * @param {string} name The metric name.
 * @param {*} value The metric value, can be a number, or callback or Promise that returns a number.
 */
Altis.Analytics.registerMetric = ( name, value ) => {
	_metrics[ name ] = value;
	Analytics.updateAudiences();
};

/**
 * Start recording default events and trigger onReady event.
 */
function startAnalytics() {
	// Avoid re-running everything.
	if ( Altis.Analytics.Ready ) {
		return;
	}

	// Set initial endpoint data.
	Analytics.mergeEndpointData( Data.Endpoint || {} );

	// Fire a ready event once userland API has been exported.
	Altis.Analytics.Ready = true;
	const readyEvent = new CustomEvent( 'altis.analytics.ready' );
	window.dispatchEvent( readyEvent );

	// Track sessions.
	document.addEventListener( 'visibilitychange', () => {
		if ( document.hidden ) {
			// On hide increment elapsed time.
			elapsed += Date.now() - start;
			// Fire session stop event.
			Analytics.record( '_session.stop' );
		} else {
			// On show reset start time.
			start = Date.now();
			// Reset subSessions.
			subSessionId = uuid();
			subSessionStart = Date.now();
			// Fire session start event.
			Analytics.record( '_session.start' );
		}
	} );

	/**
	 * Record the default page view.
	 */
	const recordPageView = () => {
		// Session start.
		Analytics.record( '_session.start' );
		// Record page view event & create/update endpoint immediately.
		Analytics.record( 'pageView', false );
	};

	if ( document.readyState === 'interactive' || document.readyState === 'complete' || document.readyState === 'loaded' ) {
		recordPageView();
	} else {
		window.addEventListener( 'DOMContentLoaded', recordPageView );
	}

	// Flush remaining events.
	window.addEventListener( 'beforeunload', () => {
		Analytics.record( '_session.stop', false );
	} );
}

// Check Altis Consent feature is in use.
if ( Consent.Enabled ) {
	// Check cookie directly for an early match.
	if ( hasAnonConsent || hasFullConsent ) {
		startAnalytics();
	} else {
		// Otherwise listen for a consent change.
		const consentChangeListener = document.addEventListener( 'wp_listen_for_consent_change', function ( e ) {
			if ( e.detail['statistics-anonymous'] && e.detail['statistics-anonymous'] === 'allow' ) {
				hasAnonConsent = true;
			}
			if ( e.detail['statistics'] && e.detail['statistics'] === 'allow' ) {
				hasFullConsent = true;
			}
			if ( hasAnonConsent || hasFullConsent ) {
				document.removeEventListener(  'wp_listen_for_consent_change', consentChangeListener );
				startAnalytics();
			}
		} );
	}
} else {
	startAnalytics();
}
