const { apiFetch } = wp;

export const getEstimate = async audience => {
	const audienceQuery = encodeURIComponent( JSON.stringify( audience ) );
	// Get audience estimate data.
	const data = await apiFetch( {
		path: `analytics/v1/audiences/estimate?audience=${ audienceQuery }`,
	} );

	return data;
};

export const getFields = async () => {
	const data = await apiFetch( {
		path: 'analytics/v1/audiences/fields',
	} );

	return data;
};

export const getAudience = async id => {
	const data = await apiFetch( {
		path: `wp/v2/audiences/${ id }?context=edit`,
	} );

	return data;
};
