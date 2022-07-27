import React from 'react';

import Views from './views';

const { useSelect } = wp.data;
const { _n, sprintf } = wp.i18n;

/**
 * Experience block variant analytics display component.
 *
 * @param {React.ComponentProps} props The component props.
 * @param {object} props.variant The personlization variant block object.
 * @returns {React.ReactNode} The variant analytics display component.
 */
const VariantAnalytics = ( { variant } ) => {
	const { audience, fallback } = variant.attributes;

	// Get the current post ID being edited.
	const postId = useSelect( select => {
		return select( 'core/editor' ).getCurrentPostId();
	} );

	// Get the XB variant parent client ID.
	const clientId = useSelect( select => {
		const { getBlockAttributes, getBlockRootClientId } = select( 'core/block-editor' );
		const parentClientId = getBlockRootClientId( variant.clientId );
		return getBlockAttributes( parentClientId ).clientId;
	}, [ variant.clientId ] );

	// Fetch the stats.
	const data = useSelect( select => {
		return select( 'accelerate/xbs' ).getViews( clientId );
	}, [ clientId ] );
	const isLoading = useSelect( select => {
		return select( 'accelerate/xbs' ).getIsLoading();
	}, [ data ] );

	// Show nothing if no audience selected and not the fallback.
	if ( ! fallback && ! audience ) {
		return null;
	}

	// No post ID so post isn't published, don't show anything.
	if ( ! postId ) {
		return null;
	}

	const audienceId = audience || 0;
	const defaultAudienceData = {
		views: 0,
		unique: {
			views: 0,
			conversions: 0,
		},
	};

	// Total loads, views & conversions.
	const audiences = ( data && data.audiences ) || [];
	const audienceData = audiences.find( data => data.id === audienceId ) || defaultAudienceData;

	// Use conversions vs total views if a goal is set.
	if ( variant.attributes.goal ) {
		return (
			<Views
				conversions={ audienceData.unique.conversions }
				isLoading={ isLoading }
				total={ audienceData.views }
				uniques={ audienceData.unique.views }
			/>
		);
	}

	// Use page loads vs block views if no goal is set e.g. show the number of impressions.
	return (
		<Views
			isLoading={ isLoading }
			label={ sprintf( _n( '%d unique view, %d total', '%d unique views, %d total', audienceData.unique.views, 'altis-analytics' ), audienceData.unique.views, audienceData.views ) }
			total={ audienceData.views }
			uniques={ audienceData.unique.views }
		/>
	);
};

export default VariantAnalytics;
