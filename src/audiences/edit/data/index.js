const { apiFetch } = wp;

export const getEstimate = async ( audience ) => {
	try {
		const audienceQuery = encodeURIComponent( JSON.stringify( audience ) );
		// Get audience estimate data.
		const data = await apiFetch( {
			path: `analytics/v1/audiences/estimate?audience=${ audienceQuery }`,
		} );

		return data;
	} catch ( error ) {
		return { error };
	}
};

export const getFields = async () => {
	try {
		const data = await apiFetch( {
			path: 'analytics/v1/audiences/fields',
		} );
		return data;
	} catch ( error ) {
		return { error };
	}
};
