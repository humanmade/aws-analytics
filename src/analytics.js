// Utils.
import './utils/polyfills';
import { uuid, getLanguage } from './utils';
import UAParser from 'ua-parser-js';
import merge from 'deepmerge';

// AWS SDK.
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity-browser/CognitoIdentityClient';
import { GetCredentialsForIdentityCommand } from '@aws-sdk/client-cognito-identity-browser/commands/GetCredentialsForIdentityCommand';
import { GetIdCommand } from '@aws-sdk/client-cognito-identity-browser/commands/GetIdCommand';
import { PinpointClient } from '@aws-sdk/client-pinpoint-browser/PinpointClient';
import { PutEventsCommand } from '@aws-sdk/client-pinpoint-browser/commands/PutEventsCommand';

const {
	_attributes,
	_metrics,
	Config,
	Data,
} = Altis.Analytics;

if ( ! Config.PinpointId || ! Config.CognitoId ) {
	/* eslint-disable quotes */
	console.warn(
		"Altis Analytics: Missing configuration. \
	You must define the following constants in PHP:\n \
	define( 'ALTIS_ANALYTICS_PINPOINT_ID', '...' );\n \
	define( 'ALTIS_ANALYTICS_PINPOINT_REGION', '...' );\n \
	define( 'ALTIS_ANALYTICS_COGNITO_ID', '...' );\n \
	define( 'ALTIS_ANALYTICS_COGNITO_REGION', '...' ); \
	"
	);
	/* eslint-enable quotes */
}

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
 * Campaign.
 */
const params = new URLSearchParams( window.location.search );
const utm = {
	utm_source: params.get( 'utm_source' ) || '',
	utm_medium: params.get( 'utm_medium' ) || '',
	utm_campaign: params.get( 'utm_campaign' ) || '',
};

/**
 * Attributes helper.
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
const getSearchParams = () =>
	Array.from( new URLSearchParams( window.location.search ).entries() ).reduce(
		( carry, [ name, value ] ) => ( {
			[ `qv_${ name }` ]: value,
			...carry,
		} ),
		{}
	);
const prepareData = async ( value, sanitizeCallback ) => {
	if ( typeof value === 'function' ) {
		value = await value();
	}
	if ( ! Array.isArray( value ) ) {
		value = [ value ];
	}
	return value.map( sanitizeCallback );
};
const sanitizeAttribute = value => value.toString();
const sanitizeMetric = value => parseFloat( Number( value ) );
const prepareAttributes = async attributes => {
	for ( const name in attributes ) {
		attributes[ name ] = await prepareData( attributes[ name ], sanitizeAttribute );
	}
	return attributes;
};
const prepareMetrics = async metrics => {
	for ( const name in metrics ) {
		metrics[ name ] = await prepareData( metrics[ name ], sanitizeMetric );
	}
	return metrics;
};
const getAttributes = ( extra = {} ) => ( {
	session: getSessionID(),
	pageSession: pageSession,
	url: window.location.origin + window.location.pathname,
	host: window.location.hostname,
	search: window.location.search,
	hash: window.location.hash,
	referer: document.referrer,
	...getSearchParams(),
	...utm,
	...( Data.Attributes || {} ),
	...extra,
	...( _attributes || {} ),
} );
const getMetrics = ( extra = {} ) => ( {
	elapsed: elapsed + ( Date.now() - start ),
	scrollDepthMax,
	scrollDepthNow,
	...extra,
	...( _metrics || {} ),
} );
const overwriteMerge = ( destinationArray, sourceArray ) => sourceArray;

/**
 * Initialise cognito services.
 */
const Analytics = {
	keys: {
		UserId: `aws.cognito.identity-id.${ Config.CognitoId }`,
		UserCredentials: `aws.cognito.identity-credentials.${ Config.CognitoId }`,
	},
	getUserId: () => localStorage.getItem( Analytics.keys.UserId ),
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
	setUserId: id => localStorage.setItem( Analytics.keys.UserId, id ),
	setUserCredentials: credentials => localStorage.setItem( Analytics.keys.UserCredentials, JSON.stringify( credentials ) ),
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
	updateEndpoint: async ( endpoint = {} ) => {
		return await Analytics.flushEvents( endpoint );
	},
	getEndpoint: () => {
		try {
			const ParsedEndpoint = JSON.parse( localStorage.getItem( 'aws.pinpoint.endpoint' ) );
			return ParsedEndpoint || {};
		} catch ( error ) {
			return {};
		}
	},
	setEndpoint: endpoint => localStorage.setItem( 'aws.pinpoint.endpoint', JSON.stringify( endpoint ) ),
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
			endpoint.User.UserAttributes = await prepareAttributes( endpoint.User.UserAttributes )
		}
		endpoint.Attributes = await prepareAttributes( endpoint.Attributes );
		endpoint.Metrics = await prepareMetrics( endpoint.Metrics );

		// Store the endpoint data.
		Analytics.setEndpoint( endpoint );

		return endpoint;
	},
	events: [],
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
			const result = await client.send( command );

			// Clear events on success.
			Analytics.events = [];

			return result;
		} catch ( error ) {
			console.error( error );
		}
	},
};

// Set initial endpoint data.
Analytics.mergeEndpointData( Data.Endpoint || {} );

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

// Start recording after document loaded and tests applied.
window.addEventListener( 'DOMContentLoaded', () => {
	// Session start.
	Analytics.record( '_session.start' );
	// Record page view event & create/update endpoint immediately.
	Analytics.record( 'pageView', false );
} );

// Flush remaining events.
window.addEventListener( 'beforeunload', () => {
	Analytics.record( '_session.stop', false );
} );

// Expose userland API.
window.Altis.Analytics.updateEndpoint = Analytics.updateEndpoint;
window.Altis.Analytics.record = ( type, data = {}, endpoint = {} ) =>
	Analytics.record(
		type,
		data,
		endpoint
	);
