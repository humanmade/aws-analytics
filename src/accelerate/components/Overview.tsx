import React from 'react';
import { useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';

import Insight from './Insight';
import { periods } from '../../data/periods';
import { Duration, getConversionRateLift, getLift, StatsResult } from '../../util';

import './Dashboard.scss';

type Props = {
	period: Duration,
};

export default function Overview( props: Props ) {
	const period = periods.find( p => p.value === props.period ) || periods[0];

	const current = useSelect<StatsResult>( select => select( 'accelerate' ).getStats( {
		period: period.value || 'P7D',
	} ) );
	const previous = useSelect<StatsResult>( select => select( 'accelerate' ).getStats( {
		period: period.value || 'P7D',
		diff: period.diff || 'P7D',
	} ) );

	const currentSummary = current?.stats?.summary;
	const previousSummary = previous?.stats?.summary;

	const currentLift = currentSummary?.lift;
	const previousLift = previousSummary?.lift;

	let globalLift: number = 0;
	let prevGlobalLift: number = 0;

	if ( currentLift && previousLift ) {
		globalLift = getConversionRateLift( currentLift.fallback, currentLift.personalized );
		prevGlobalLift = getConversionRateLift( previousLift.fallback, previousLift.personalized );
	}

	return (
		<div className="Overview">
			<div className="key-insight-wrap">
				<Insight
					delta={ period.diff && currentSummary && previousSummary ? getLift( currentSummary.views, previousSummary.views ) : null }
					description={ sprintf( __( 'Total page views for the last %s.', 'altis' ), period.label ) }
					title={ __( 'Page views', 'altis' ) }
					stat={ currentSummary?.views }
				/>
				<Insight
					delta={ period.diff && currentLift && previousLift ? getLift( currentLift.views, previousLift.views ) : null }
					description={ sprintf( __( 'Total Experience Block views for the last %s.', 'altis' ), period.label ) }
					title={ __( 'Experience Block views', 'altis' ) }
					stat={ currentLift?.views }
				/>
				<Insight
					delta={ globalLift && prevGlobalLift ? getLift( prevGlobalLift, globalLift ) : null }
					description={ __( 'Aggregated lift across all personalized content.', 'altis' ) }
					title={ __( 'Lift', 'altis' ) }
					stat={ parseFloat( globalLift.toFixed( 1 ) ) }
				/>
			</div>
		</div >
	)
}
