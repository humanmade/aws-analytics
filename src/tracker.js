// Utils.
import "./utils/polyfills";
import arrive from "arrive";
import { uuid, getLanguage } from "./utils";
import UAParser from "ua-parser-js";

// AWS SDK.
import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity-browser/CognitoIdentityClient";
import { GetCredentialsForIdentityCommand } from "@aws-sdk/client-cognito-identity-browser/commands/GetCredentialsForIdentityCommand";
import { GetIdCommand } from "@aws-sdk/client-cognito-identity-browser/commands/GetIdCommand";
import { PinpointClient } from "@aws-sdk/client-pinpoint-browser/PinpointClient";
import { PutEventsCommand } from "@aws-sdk/client-pinpoint-browser/commands/PutEventsCommand";
import { UpdateEndpointCommand } from "@aws-sdk/client-pinpoint-browser/commands/UpdateEndpointCommand";

const { Config, Tests, Data } = HM.Analytics;

if (!Config.PinpointId || !Config.CognitoId) {
	console.warn(
		"HM Analytics: Missing configuration. \
    You must define the following constants in PHP:\n \
    define( 'HM_ANALYTICS_PINPOINT_ID', '...' );\n \
    define( 'HM_ANALYTICS_PINPOINT_REGION', '...' );\n \
    define( 'HM_ANALYTICS_COGNITO_ID', '...' );\n \
    define( 'HM_ANALYTICS_COGNITO_REGION', '...' ); \
    "
	);
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
window.addEventListener("scroll", () => {
	const percent = (window.scrollY / document.body.clientHeight) * 100;
	scrollDepthMax = percent > scrollDepthMax ? percent : scrollDepthMax;
	scrollDepthNow = percent;
});

/**
 * Campaign.
 */
const params = new URLSearchParams(window.location.search);
const utm = {
	utm_source: params.get("utm_source") || "",
	utm_medium: params.get("utm_medium") || "",
	utm_campaign: params.get("utm_campaign") || ""
};

/**
 * Tests.
 */
document.arrive( '.post-ab-test', function () {
	const testId = this.dataset.test;
	const variants = JSON.parse( this.dataset.variants );
	const trafficPercentage = this.dataset['traffic-percentage'];

	// Check if this user already have a variant for this test.
	const currentTests = getTestsForUser();
	let variantId = null;
	if ( currentTests[ testId ] ) {
		variantId = currentTests[ testId ];
	} else if ( currentTests[ testId ] === false ) {
		return;
	} else {
		// Otherwise lets check the probability we should experiment on this individual. That sounded weird.
		if ( Math.random() * 100 > trafficPercentage ) {
			// Exclude from this test.
			addTestForUser({
				[testId]: false
			});
			return;
		}
		// Add one of the variants to the cookie.
		variantId = Math.floor(Math.random() * variants.length);
		addTestForUser({
			[testId]: variantId
		});
	}

	// Apply the variant
	this.innerHTML = variants[ variantId ];
} );

// Helpers for test data in sessionStorage.
const getTestsForUser = () => JSON.parse(window.localStorage.getItem("_hm_tests")) || {};

const addTestForUser = test =>
	window.localStorage.setItem("_hm_tests", JSON.stringify({ ...getTestsForUser(), ...test }));

const removeTestForUser = testName => {
	const tests = getTestsForUser();
	delete tests[testName];
	window.localStorage.setItem("_hm_tests", JSON.stringify(tests));
};

// Extract test set by campaign parameter and add for user.
const utm_test = utm.utm_campaign.match(/tests_([a-z0-9_-]+):(\d+)/i);
if (utm_test) {
	addTestForUser({ [utm_test[1]]: parseInt(utm_test[2], 10) });
}

const activeTests = {};

/**
 * Attributes helper.
 */
const getSessionID = () => {
	if (typeof window.sessionStorage === "undefined") {
		return null;
	}

	// Get stored session.
	const sessionID = window.sessionStorage.getItem("_hm_uuid");

	if (sessionID) {
		return sessionID;
	}

	// Create and set a UUID.
	const newSessionID = uuid();
	window.sessionStorage.setItem("_hm_uuid", newSessionID);
	return newSessionID;
};
const getSearchParams = () =>
	Array.from(new URLSearchParams(window.location.search).entries()).reduce(
		(carry, [name, value]) => ({ [`qv_${name}`]: value, ...carry }),
		{}
	);
const getUserTests = () =>
	Object.entries(getTestsForUser()).reduce((carry, [name, value]) => ({ ...carry, [`userTest_${name}`]: value }), {});
const getAttributes = (extra = {}) =>
	Object.entries({
		session: getSessionID(),
		pageSession: pageSession,
		url: window.location.origin + window.location.pathname,
		host: window.location.hostname,
		search: window.location.search,
		hash: window.location.hash,
		referer: document.referrer,
		...getSearchParams(),
		...getUserTests(),
		...activeTests,
		...utm,
		...(Data.Attributes || {}),
		...extra
	}).reduce((carry, [name, value]) => ({ ...carry, [name]: value.toString() }), {});
const getMetrics = (extra = {}) =>
	Object.entries({
		elapsed: elapsed + (Date.now() - start),
		scrollDepthMax,
		scrollDepthNow,
		...extra
	}).reduce((carry, [name, value]) => ({ ...carry, [name]: Number(value) }), {});

/**
 * Initialise cognito services.
 */
const Analytics = {
	keys: {
		UserId: `aws.cognito.identity-id.${Config.CognitoId}`,
		UserCredentials: `aws.cognito.identity-credentials.${Config.CognitoId}`
	},
	getUserId: () => localStorage.getItem(Analytics.keys.UserId),
	getUserCredentials: () => {
		try {
			const ParsedCredentials = JSON.parse(localStorage.getItem(Analytics.keys.UserCredentials));
			if (new Date(ParsedCredentials.Credentials.Expiration).getTime() > Date.now()) {
				return ParsedCredentials;
			}
		} catch (error) {}
		return false;
	},
	setUserId: id => localStorage.setItem(Analytics.keys.UserId, id),
	setUserCredentials: credentials => localStorage.setItem(Analytics.keys.UserCredentials, JSON.stringify(credentials)),
	authenticate: async () => {
		// Get user credentials from cache.
		let UserId = Analytics.getUserId();
		let UserCredentials = Analytics.getUserCredentials();
		if (UserCredentials && UserCredentials.Credentials) {
			return UserCredentials.Credentials;
		}

		// Configure Cognito client.
		const params = {
			region: Config.CognitoRegion,
			credentials: {}
		};
		if (Config.CognitoEndpoint) {
			params.endpoint = Config.CognitoEndpoint;
		}
		const client = new CognitoIdentityClient(params);

		// Get unique ID if not set.
		if (!UserId) {
			try {
				const getIdCommand = new GetIdCommand({ IdentityPoolId: Config.CognitoId });
				const result = await client.send(getIdCommand);
				UserId = result.IdentityId;
				Analytics.setUserId(UserId);
			} catch (error) {
				console.error(error);
			}
		}

		// Get credentials for user from Cognito.
		try {
			const getCredentialsCommand = new GetCredentialsForIdentityCommand({ IdentityId: UserId });
			const result = await client.send(getCredentialsCommand);
			UserCredentials = result;
			Analytics.setUserCredentials(UserCredentials);
			return UserCredentials.Credentials;
		} catch (error) {
			console.error(error);
		}
		return false;
	},
	getClient: async () => {
		if (Analytics.client) {
			return await Analytics.client;
		}

		// Ensure repeat calls wait for the same promise.
		Analytics.client = (async () => {
			// Get user credentials for pinpoint client.
			const Credentials = await Analytics.authenticate();
			if (!Credentials) {
				console.error("Credentials not found.", error);
				return;
			}

			// Configure client.
			const params = {
				region: Config.PinpointRegion,
				credentials: {
					accessKeyId: Credentials.AccessKeyId,
					secretAccessKey: Credentials.SecretKey,
					expiration: Credentials.Expiration,
					sessionToken: Credentials.SessionToken
				}
			};
			if (Config.PinpointEndpoint) {
				params.endpoint = Config.PinpointEndpoint;
			}
			const client = new PinpointClient(params);
			Analytics.client = client;
			return client;
		})();

		return await Analytics.client;
	},
	updateEndpoint: async (endpoint = {}) => {
		// Get client & authenticate.
		const client = await Analytics.getClient();
		// Get endpoint ID.
		const UserId = Analytics.getUserId();
		if (!UserId) {
			console.error("No User ID found. Make sure to call Analytics.authenticate() first.");
			return;
		}

		const EndpointId = UserId.replace(`${Config.CognitoRegion}:`, "");
		const UAData = UAParser(navigator.userAgent);
		const EndpointData = {
			Address: "", // Destination for push notifications / campaigns.
			Attributes: {
				DeviceMake: [UAData.device.vendor || ""],
				DeviceModel: [UAData.device.model || ""],
				DeviceType: [UAData.device.type || ""]
			},
			ChannelType: "CUSTOM", // GCM | APNS | APNS_SANDBOX | APNS_VOIP | APNS_VOIP_SANDBOX | ADM | SMS | VOICE | EMAIL | BAIDU | CUSTOM,
			Demographic: {
				AppVersion: Data.AppVersion || "",
				Locale: getLanguage(),
				Make: UAData.engine.name || "",
				Model: UAData.browser.name || "",
				ModelVersion: UAData.browser.version || "",
				Platform: UAData.os.name || "",
				PlatformVersion: UAData.os.version || ""
			},
			Location: {},
			EffectiveDate: new Date().toISOString(),
			Metrics: {},
			OptOut: "ALL",
			RequestId: uuid(),
			User: {
				UserAttributes: {},
				UserId: UserId
			}
		};

		// Merge new endpoint data with defaults.
		const EndpointRequest = Object.entries(EndpointData).reduce((carry, [key, value]) => {
			if (typeof value === "object") {
				carry[key] = Object.assign(value, endpoint[key] || {});
			} else {
				carry[key] = endpoint[key] || value;
			}
			return carry;
		}, {});

		const PrevEndpoint = Analytics.getEndpoint(UserId);
		if (PrevEndpoint && JSON.stringify(PrevEndpoint) === JSON.stringify(EndpointRequest)) {
			return EndpointRequest;
		}

		try {
			const command = new UpdateEndpointCommand({
				ApplicationId: Config.PinpointId,
				EndpointId: EndpointId,
				EndpointRequest: EndpointRequest
			});
			await client.send(command);
			Analytics.setEndpoint(UserId, EndpointRequest);
			return EndpointRequest;
		} catch (error) {
			console.error(error);
		}
	},
	getEndpoint: id => {
		try {
			const ParsedEndpoint = JSON.parse(localStorage.getItem(`aws.pinpoint.endpoint.${id}`));
			if (ParsedEndpoint.User.UserId === id) {
				return ParsedEndpoint;
			}
		} catch (error) {}
		return false;
	},
	setEndpoint: (id, endpoint) => localStorage.setItem(`aws.pinpoint.endpoint.${id}`, JSON.stringify(endpoint)),
	events: [],
	record: (type, data = {}, queue = true) => {
		const EventId = uuid();
		const Event = {
			[EventId]: {
				EventType: type /* required */,
				Timestamp: new Date().toISOString(),
				AppPackageName: Data.AppPackageName || "",
				AppTitle: Data.SiteName || "",
				AppVersionCode: Data.AppVersion || "",
				Attributes: Object.assign({}, data.attributes || {}),
				Metrics: Object.assign({}, data.metrics || {}),
				Session: {
					Id: subSessionId /* required */,
					StartTimestamp: new Date(subSessionStart).toISOString() /* required */
				}
			}
		};

		// Add session stop parameters.
		if (type === "_session.stop") {
			Event[EventId].Session.Duration = Date.now() - subSessionStart;
			Event[EventId].Session.StopTimestamp = new Date().toISOString();
		}

		// Store sent events.
		Analytics.events.push(Event);

		// Flush the events if we don't want to queue.
		if (!queue) {
			Analytics.flushEvents();
			return;
		}

		if (Analytics.timer) {
			clearTimeout(Analytics.timer);
		}

		// Flush new events after 5 seconds.
		Analytics.timer = setTimeout(Analytics.flushEvents, 5000);
	},
	flushEvents: async () => {
		// Check we have events.
		if (!Analytics.events.length) {
			return;
		}

		// Get the client.
		const client = await Analytics.getClient();

		// Events are associated with an endpoint.
		const UserId = Analytics.getUserId();
		if (!UserId) {
			console.error("No User ID found. Make sure to call Analytics.authenticate() first.");
			return;
		}

		const Events = Analytics.events.reduce((carry, event) => ({ ...event, ...carry }), {});
		const BatchUserId = UserId.replace(`${Config.CognitoRegion}:`, "");
		const EventsRequest = {
			BatchItem: {
				[BatchUserId]: {
					Endpoint: {},
					Events: Events
				}
			}
		};

		try {
			const command = new PutEventsCommand({
				ApplicationId: Config.PinpointId,
				EventsRequest: EventsRequest
			});
			const result = await client.send(command);

			// Clear events on success.
			Analytics.events = [];

			return result;
		} catch (error) {
			console.error(error);
		}
	}
};

/**
 * Set endpoint data.
 */
Analytics.updateEndpoint(Data.Endpoint || {});

// Record all link clicks.
// @todo implement button & other form input interactions.
document.addEventListener("click", event => {
	let el = event.target,
		max = 5,
		lvl = 0;
	const nodes = ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"];
	while (nodes.indexOf(el.nodeName) < 0 && el.parentNode && lvl++ < max) {
		el = el.parentNode;
	}

	if (nodes.indexOf(el.nodeName) < 0) {
		return;
	}

	let test = {};

	// Check for any tests as child nodes for tests
	if ( event.target.dataset.test && event.target.dataset.metric === 'click' ) {
		const testId = event.target.dataset.test;
		const tests = getTestsForUser();
		if ( typeof tests[ testId ] === 'number' ) {
			test = {
				testId,
				testPostId: event.target.dataset.postId,
				testVariantId: tests[ testId ]
			};
		}
	}

	// create a one time cookie / session value?
	// collect source event?
	const attributes = getAttributes({
		targetNode: event.target.nodeName || "",
		targetClassName: event.target.className || "",
		targetId: event.target.id || "",
		targetSrc: event.target.nodeName === "IMG" ? event.target.src : "",
		// @todo consider target path eg. DOM tree. Useful?
		elementClassName: el.className || "",
		elementId: el.id || "",
		elementHref: el.getAttribute("href") || "",
		elementText: el.innerText || "",
		clickX: event.pageX,
		clickY: event.pageY,
		...test,
	});
	Analytics.record("click", {
		attributes
	});
});

// Track sessions.
document.addEventListener("visibilitychange", () => {
	if (document.hidden) {
		// On hide increment elapsed time.
		elapsed += Date.now() - start;
		// Fire session stop event.
		Analytics.record("_session.stop", {
			attributes: getAttributes({}),
			metrics: getMetrics({})
		});
	} else {
		// On show reset start time.
		start = Date.now();
		// Reset subSessions.
		subSessionId = uuid();
		subSessionStart = Date.now();
		// Fire session start event.
		Analytics.record("_session.start", {
			attributes: getAttributes({})
		});
	}
});

// Start recording after document loaded and tests applied.
window.addEventListener("DOMContentLoaded", () => {
	// Session start.
	Analytics.record("_session.start", {
		attributes: getAttributes({})
	});

	// Record page view event immediately.
	Analytics.record(
		"pageView",
		{
			attributes: getAttributes({})
		},
		false
	);
});

// Flush remaining events.
window.addEventListener("beforeunload", async () => {
	Analytics.record("_session.stop", {
		attributes: getAttributes({}),
		metrics: getMetrics({})
	});
	await Analytics.flushEvents();
});

// Expose userland API.
window.Analytics = {
	updateEndpoint: Analytics.updateEndpoint,
	record: (type, data = {}, queue = true) =>
		Analytics.record(
			type,
			{
				attributes: getAttributes(data.attributes || {}),
				metrics: getMetrics(data.metrics || {})
			},
			queue
		)
};
