import React from 'react';

import Views from './views';

const { useSelect } = wp.data;
const { __, sprintf } = wp.i18n;

/**
 * Block analytics data display component.
 *
 * @param {React.ComponentProps} props The component props.
 * @param {string} props.clientId The block client ID.
 * @returns {React.ReactNode} The block analytics data component.
 */
const BlockAnalytics = ( { clientId } ) => {
	const postId = useSelect( select => {
		return select( 'core/editor' ).getCurrentPostId();
	} );

	// Fetch the stats.
	const data = useSelect( select => {
		return select( 'accelerate/xbs' ).getViews( clientId );
	}, [ clientId ] );
	const isLoading = useSelect( select => {
		return select( 'accelerate/xbs' ).getIsLoading();
	}, [ data ] );

	// No post ID so post isn't published, don't show anything.
	if ( ! postId ) {
		return null;
	}

	const totalLoads = ( data && data.loads ) || 0;
	const totalViews = ( data && data.views ) || 0;
	const uniqueLoads = ( data && data.unique && data.unique.loads ) || 0;
	const uniqueViews = ( data && data.unique && data.unique.views ) || 0;

	return (
		<div className="altis-experience-block-analytics">
			<h4>{ __( 'Block Insights', 'altis-analytics' ) }</h4>
			<p>{ __( 'Statistics shown are for the last 7 days.', 'altis-analytics' ) }</p>
			<Views
				conversions={ uniqueViews }
				conversionsLabel={ sprintf( __( '%d unique block views, %d total', 'altis-analytics' ), uniqueViews, totalViews ) }
				isLoading={ isLoading }
				label={ sprintf( __( '%d unique page views, %d total', 'altis-analytics' ), uniqueLoads, totalLoads ) }
				total={ totalLoads }
				uniques={ uniqueLoads }
			/>
		</div>
	);
};

export default BlockAnalytics;
