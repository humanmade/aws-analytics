import { stringify } from 'query-string';

const { apiFetch } = wp;

export const getEstimate = async ( audience ) => {
	const audienceQuery = encodeURIComponent( JSON.stringify( audience ) );
	// Get audience estimate data.
	const data = await apiFetch( {
		path: `analytics/v1/audiences/estimate?audience=${ audienceQuery }`,
	} )

	return {
		count: 23,
		histogram: [],
	};
};

export const getFields = async () => {
	const data = await apiFetch( {
		path: 'analytics/v1/audiences/fields',
	} );

	return data;
};
